import { useState, useEffect, useRef } from "react";
import { useParams, Link, Navigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Globe, MapPin, Mail, Phone, User,
  CheckCircle2, Loader2, ChevronLeft, ChevronRight,
  Copy, Check, X, QrCode, CreditCard, MessageCircle, Camera, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContent } from "@/contexts/ContentContext";
import { fetchAvailabilitySlots, fetchBookingsForDate, insertBooking, confirmBookingsByGroupId, type Booking } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string;

function toLocalISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function generateGroupId() {
  return `booking_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface SessionSlot { date: Date | null; time: string | null; type: "online" | "presencial" | null; }
type PayTab = "pix" | "card";
type Stage = "idle" | "loading" | "pix_qr" | "card_form" | "approved" | "error";

declare global {
  interface Window { MercadoPago: unknown; }
}

const BookingPage = () => {
  const { planIndex } = useParams<{ planIndex: string }>();
  const [searchParams] = useSearchParams();
  const isFree = searchParams.get("free") === "1";
  const { content, whatsappUrl } = useContent();
  const { loja, identity } = content;

  const idx = Number(planIndex ?? "0");
  const plan = loja.plans[idx] ?? {
    name: "Consulta Gratuita (20 min)",
    price: "Gratuito",
    priceAmount: 0,
    consultationType: "online" as const,
    returnCount: 0,
    sessionCount: 1,
    desc: "",
    features: [],
    popular: false,
    whatsappMessage: "",
  };
  if (!isFree && !loja.plans[idx]) return <Navigate to="/" replace />;

  // 1 consulta inicial + N retornos (sessionCount não entra na soma pois
  // representa o total de encontros do plano, não consultas adicionais)
  const totalReturns = plan.returnCount || 0;
  const totalSessions = 1 + totalReturns;

  // Wizard state
  // If plan already defines a single type, skip the selection step
  // Also infer from plan name as fallback
  const inferredType: "online" | "presencial" | null =
    plan.consultationType === "online" || plan.consultationType === "presencial"
      ? plan.consultationType
      : /online/i.test(plan.name)
        ? "online"
        : /presencial/i.test(plan.name)
          ? "presencial"
          : null;
  const planType = inferredType;

  const [step, setStep] = useState(planType ? 1 : 0);
  const [consultationType, setConsultationType] = useState<"online" | "presencial" | null>(planType);
  const [availSlots, setAvailSlots] = useState<Array<{ id: number; date: string; start_time: string; type: string }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [sessions, setSessions] = useState<SessionSlot[]>([]);
  const [currentSessionIdx, setCurrentSessionIdx] = useState(0);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingBooked, setLoadingBooked] = useState(false);

  // Personal info
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");

  // Clinical info
  const [anamnesisPhotos, setAnamnesisPhotos] = useState<File[]>([]);
  const [goal, setGoal] = useState("");
  const [allergies, setAllergies] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [healthConditions, setHealthConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [hadNutritionist, setHadNutritionist] = useState("");
  const [howFound, setHowFound] = useState("");

  // Payment
  const [payTab, setPayTab] = useState<PayTab>("pix");
  const [stage, setStage] = useState<Stage>("idle");
  const [pixData, setPixData] = useState<{ payment_id: number; qr_code: string; qr_code_base64: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [bookingGroupId] = useState(generateGroupId);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const brickRendered = useRef(false);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  // Load available slots only when consultationType changes (step 0 → 1)
  useEffect(() => {
    if (!consultationType) return;
    setLoadingSlots(true);
    fetchAvailabilitySlots().then(data => {
      setAvailSlots(data);
      setLoadingSlots(false);
    });
    // Paciente só escolhe a data da 1ª consulta; retornos são agendados pelo nutricionista
    setSessions([{ date: null, time: null, type: consultationType }]);
    setCurrentSessionIdx(0);
  }, [consultationType]);

  // Load MP SDK when reaching payment step
  useEffect(() => {
    if (step !== 4) return;
    if (document.getElementById("mp-sdk")) return;
    const script = document.createElement("script");
    script.id = "mp-sdk";
    script.src = "https://sdk.mercadopago.com/js/v2";
    document.head.appendChild(script);
  }, [step]);

  // Render Payment Brick when card tab active
  useEffect(() => {
    if (step !== 4 || payTab !== "card" || stage !== "idle") return;
    if (brickRendered.current) return;
    if (!MP_PUBLIC_KEY) return;             // guard: MP not configured
    if (!plan.priceAmount || plan.priceAmount <= 0) return; // guard: no amount

    const tryRender = (attempts = 0) => {
      // Wait for both: MercadoPago SDK and the div in the DOM
      const mpReady = !!(window as unknown as Record<string, unknown>).MercadoPago;
      const divReady = !!document.getElementById("mp-payment-brick");
      if (!mpReady || !divReady) {
        if (attempts < 30) setTimeout(() => tryRender(attempts + 1), 300);
        return;
      }
      brickRendered.current = true;
      const mp = new (window as unknown as Record<string, new(key: string, opts: object) => unknown>).MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      const builder = (mp as unknown as Record<string, unknown>).bricks();
      (builder as unknown as Record<string, (type: string, id: string, config: object) => void>).create("payment", "mp-payment-brick", {
        initialization: {
          amount: plan.priceAmount,
          payer: { email: clientEmail },
        },
        customization: {
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            maxInstallments: 12,
          },
          visual: { hideFormTitle: true, style: { theme: "default" } },
        },
        callbacks: {
          onReady: () => { console.log("MP Brick ready ✓"); },
          onError: (err: unknown) => {
            console.error("MP Brick error:", err);
            brickRendered.current = false;
            toast({ title: "Erro ao carregar formulário de cartão. Tente usar o Pix.", variant: "destructive" });
          },
          onSubmit: async ({ formData }: { formData: Record<string, unknown> }) => {
            setStage("loading");
            try {
              // Salva como "pending" antes de enviar ao MP — garante que o booking
              // existe no banco mesmo que algo falhe depois do pagamento ser aprovado
              await saveBookings("pending");

              const res = await fetch(`${SUPABASE_URL}/functions/v1/process-consultation-payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  paymentMethod: "card",
                  formData,
                  amount: plan.priceAmount,
                  customerEmail: clientEmail,
                  customerName: clientName,
                  planName: plan.name,
                  bookingGroupId,
                }),
              });
              const data = await res.json();
              if (data.status === "approved") {
                const saved = await saveBookings("confirmed");
                if (!saved) toast({ title: "Pagamento aprovado, mas erro ao salvar agendamento. Entre em contato.", variant: "destructive" });
                setStage("approved");
              } else {
                // Traduz status_detail do MP para mensagem amigável
                const detailMessages: Record<string, string> = {
                  cc_rejected_insufficient_amount:   "Saldo insuficiente no cartão.",
                  cc_rejected_bad_filled_card_number:"Número do cartão incorreto.",
                  cc_rejected_bad_filled_date:       "Data de vencimento incorreta.",
                  cc_rejected_bad_filled_security_code: "Código de segurança incorreto.",
                  cc_rejected_call_for_authorize:    "Ligue para o banco para autorizar.",
                  cc_rejected_high_risk:             "Transação recusada por segurança. Tente outro cartão.",
                  rejected_by_bank:                  "Recusado pelo banco. Tente outro cartão.",
                  cc_rejected_card_disabled:         "Cartão desativado. Entre em contato com o banco.",
                  cc_rejected_duplicated_payment:    "Pagamento duplicado detectado.",
                  pending_waiting_payment:           "Pagamento pendente. Aguarde a confirmação.",
                };
                const detail = data.status_detail as string | undefined;
                const friendlyMsg = (detail && detailMessages[detail]) || data.error || `Pagamento não aprovado${detail ? ` (${detail})` : ""}.`;
                throw new Error(friendlyMsg);
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Erro no pagamento";
              setStage("error");
              toast({ title: msg, variant: "destructive" });
            }
          },
        },
      });
    };
    setTimeout(() => tryRender(0), 300);
  }, [step, payTab, stage]);

  // When switching tab, reset brick rendered flag
  const handlePayTabChange = (tab: PayTab) => {
    setPayTab(tab);
    if (tab === "card") brickRendered.current = false;
  };

  const handleDateSelect = async (date: Date) => {
    const newSessions = [...sessions];
    newSessions[currentSessionIdx] = { date, time: null };
    setSessions(newSessions);
    setLoadingBooked(true);
    const booked = await fetchBookingsForDate(toLocalISO(date), sessions[currentSessionIdx]?.type || consultationType!);
    setBookedTimes(booked.map(b => (b as unknown as { appointment_time: string }).appointment_time.substring(0, 5)));
    setLoadingBooked(false);
  };

  const handleTimeSelect = (time: string) => {
    const newSessions = [...sessions];
    newSessions[currentSessionIdx] = { ...newSessions[currentSessionIdx], time };
    setSessions(newSessions);
  };

  const canSelectDate = (date: Date) => {
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    if (date < todayMidnight) return false;
    const sessionType = sessions[currentSessionIdx]?.type || consultationType;
    return availSlots.some(s => s.date === toLocalISO(date) && s.type === sessionType);
  };

  const getTimesForDate = (date: Date | null) => {
    if (!date) return [];
    const sessionType = sessions[currentSessionIdx]?.type || consultationType;
    return availSlots.filter(s => s.date === toLocalISO(date) && s.type === sessionType).map(s => s.start_time.substring(0, 5)).sort();
  };

  const handleSessionTypeChange = (type: "online" | "presencial") => {
    const newSessions = [...sessions];
    newSessions[currentSessionIdx] = { date: null, time: null, type };
    setSessions(newSessions);
  };

  const saveBookings = async (status = "pending"): Promise<boolean> => {
    let allOk = true;
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s.date || !s.time) continue;
      const notes = JSON.stringify({
        birthDate, sex, goal, allergies, restrictions,
        healthConditions, medications, hadNutritionist, howFound,
      });
      const booking: Booking = {
        booking_group_id: bookingGroupId,
        session_number: i + 1,
        total_sessions: totalSessions,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        plan_name: plan.name,
        plan_index: idx,
        appointment_date: toLocalISO(s.date),
        appointment_time: s.time,
        type: (s.type || consultationType)!,
        status,
        notes,
      };
      const ok = await insertBooking(booking);
      if (!ok) allOk = false;
    }
    return allOk;
  };

  const handlePixPayment = async () => {
    if (!plan.priceAmount || plan.priceAmount <= 0) {
      toast({ title: "Preço não configurado para este plano.", variant: "destructive" });
      return;
    }
    setStage("loading");
    try {
      // Salva o booking como "pending" ANTES de criar o pagamento
      // Garante que o booking existe mesmo que o usuário feche a aba após pagar
      const saved = await saveBookings("pending");
      if (!saved) {
        toast({ title: "Aviso: não foi possível salvar o agendamento. Entre em contato após o pagamento.", variant: "destructive" });
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/process-consultation-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "pix",
          amount: plan.priceAmount,
          customerEmail: clientEmail,
          customerName: clientName,
          planName: plan.name,
          bookingGroupId,
        }),
      });
      const data = await res.json();
      if (!data.qr_code) throw new Error(data.error || "Erro ao gerar Pix");
      setPixData({ payment_id: data.payment_id, qr_code: data.qr_code, qr_code_base64: data.qr_code_base64 });
      setStage("pix_qr");
      startPolling(data.payment_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      setStage("error");
      toast({ title: msg, variant: "destructive" });
    }
  };

  const startPolling = (paymentId: number) => {
    let isMounted = true;
    const POLL_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
    const startedAt = Date.now();

    pollingRef.current = setInterval(async () => {
      if (!isMounted) { clearInterval(pollingRef.current!); return; }

      // Timeout de 30 minutos: para de verificar e volta para idle
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(pollingRef.current!);
        if (isMounted) {
          setStage("idle");
          toast({ title: "Tempo de pagamento expirado", description: "O QR Code Pix expirou. Tente novamente.", variant: "destructive" });
        }
        return;
      }

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/check-payment-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_id: paymentId }),
        });
        const data = await res.json();
        if (data.status === "approved") {
          clearInterval(pollingRef.current!);
          await confirmBookingsByGroupId(bookingGroupId);
          if (isMounted) setStage("approved");
        }
      } catch (_) {}
    }, 3000);

    // Cleanup ao desmontar
    return () => { isMounted = false; clearInterval(pollingRef.current!); };
  };

  const handleFreeBooking = async () => {
    setStage("loading");
    const ok = await saveBookings("confirmed");
    if (ok) {
      setStage("approved");
    } else {
      setStage("error");
      toast({ title: "Erro ao salvar agendamento. Tente novamente.", variant: "destructive" });
    }
  };

  const handleCopy = () => {
    if (!pixData?.qr_code) return;
    navigator.clipboard.writeText(pixData.qr_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Calendar
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };

  const currentSession = sessions[currentSessionIdx];
  const availTimes = getTimesForDate(currentSession?.date || null);
  const allPicked = sessions.every(s => s.date && s.time);
  const todayISO = toLocalISO(new Date());

  // ── SUCCESS ──
  if (stage === "approved") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageHeader brand={identity.brandName} />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-sm w-full bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <div className="h-1.5 bg-primary w-full" />
            <div className="px-8 py-10 flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold text-foreground">Consulta confirmada!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isFree ? "Agendamento salvo! Um email de confirmação será enviado para" : "Pagamento aprovado. Um email de confirmação foi enviado para"}
                </p>
                <p className="text-sm font-semibold bg-muted px-3 py-1.5 rounded-lg inline-block">{clientEmail}</p>
              </div>
              {/* Data da consulta */}
              {sessions[0]?.date && sessions[0]?.time && (
                <div className="w-full text-left space-y-1.5 bg-primary/5 border border-primary/10 rounded-xl p-4">
                  <div className="flex justify-between text-xs gap-2">
                    <span className="text-muted-foreground font-medium">Consulta inicial</span>
                    <span className="font-semibold">{sessions[0].date.toLocaleDateString("pt-BR")} · {sessions[0].time} · {sessions[0].type === "online" ? "Online" : "Presencial"}</span>
                  </div>
                  {totalReturns > 0 && (
                    <p className="text-xs text-muted-foreground/70 mt-2 pt-2 border-t border-primary/10">
                      Os {totalReturns} retorno{totalReturns > 1 ? "s" : ""} do seu plano serão agendados pelo nutricionista após cada consulta.
                    </p>
                  )}
                </div>
              )}
              <Button asChild variant="outline" size="sm" className="rounded-full gap-2 w-full">
                <Link to="/"><ArrowLeft className="h-3.5 w-3.5" />Voltar ao início</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader brand={identity.brandName} />

      <main className="flex-1 py-10 px-4">
        <div className="max-w-lg mx-auto space-y-6">

          {/* Plan title */}
          <div className="text-center space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Agendar consulta</p>
            <h1 className="font-display text-2xl font-bold text-foreground">{plan.name}</h1>
            <p className="text-sm text-muted-foreground">
              {isFree ? "Online · Gratuita · 20 min" : `${totalSessions} sessão${totalSessions > 1 ? "ões" : ""} · ${plan.price}`}
            </p>
            {totalReturns > 0 && (
              <p className="text-xs text-muted-foreground/70">
                Os {totalReturns} retorno{totalReturns > 1 ? "s" : ""} serão agendados pelo nutricionista após cada consulta
              </p>
            )}
          </div>

          {/* Steps indicator */}
          {(() => {
            const steps = isFree
              ? ["Datas", "Dados", "Clínico"]
              : planType
                ? ["Datas", "Dados", "Clínico", "Pagamento"]
                : ["Tipo", "Datas", "Dados", "Clínico", "Pagamento"];
            const displayStep = (isFree || planType) ? step - 1 : step;
            return (
              <div className="flex items-center justify-center gap-1">
                {steps.map((label, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < displayStep ? "bg-primary text-primary-foreground" :
                      i === displayStep ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                      "bg-muted text-muted-foreground"
                    }`}>{i < displayStep ? "✓" : i + 1}</div>
                    <span className={`text-xs hidden sm:block ${i === displayStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
                    {i < steps.length - 1 && <div className={`h-px w-4 mx-1 ${i < displayStep ? "bg-primary" : "bg-border"}`} />}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── STEP 0: Type ── */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-center">Como prefere a consulta?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "online" as const, label: "Online", sub: "Google Meet / Zoom", icon: Globe },
                  { id: "presencial" as const, label: "Presencial", sub: "No consultório", icon: MapPin },
                ].filter(t => !plan.consultationType || plan.consultationType === "both" || plan.consultationType === t.id)
                 .map(({ id, label, sub, icon: Icon }) => (
                  <button key={id} onClick={() => setConsultationType(id)}
                    className={`rounded-2xl border p-5 text-left transition-all ${consultationType === id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card hover:border-primary/30"}`}>
                    <Icon className={`h-6 w-6 mb-3 ${consultationType === id ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </button>
                ))}
              </div>
              <Button className="w-full rounded-full gap-2" disabled={!consultationType} onClick={() => setStep(1)}>
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ── STEP 1: Dates ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground text-center">
                Escolha a data da sua primeira consulta
              </p>

              {/* Per-session type toggle */}
              <div className="flex gap-2">
                {[
                  { id: "online" as const, label: "Online", icon: Globe },
                  { id: "presencial" as const, label: "Presencial", icon: MapPin },
                ].filter(t => !planType || planType === "both" || planType === t.id)
                 .map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => handleSessionTypeChange(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      sessions[currentSessionIdx]?.type === id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/30"
                    }`}>
                    <Icon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>

              {/* Per-session type toggle */}
              <div className="flex gap-2">
                {[
                  { id: "online" as const, label: "Online", icon: Globe },
                  { id: "presencial" as const, label: "Presencial", icon: MapPin },
                ].filter(t => !planType || planType === "both" || planType === t.id)
                 .map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => handleSessionTypeChange(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      sessions[currentSessionIdx]?.type === id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/30"
                    }`}>
                    <Icon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : (
                <>
                  {/* Calendar */}
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
                      <span className="text-sm font-semibold">{MONTHS_PT[calMonth]} {calYear}</span>
                      <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {["D","S","T","Q","Q","S","S"].map((d, i) => (
                        <div key={i} className="text-center text-xs text-muted-foreground py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
                      {Array(daysInMonth).fill(null).map((_, i) => {
                        const day = i + 1;
                        const dateISO = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                        const date = new Date(calYear, calMonth, day);
                        const canSelect = canSelectDate(date);
                        const isSelected = currentSession?.date && toLocalISO(currentSession.date) === dateISO;
                        const isToday = dateISO === todayISO;
                        return (
                          <button key={day} disabled={!canSelect} onClick={() => handleDateSelect(date)}
                            className={`h-9 w-full rounded-lg text-xs font-medium transition-all ${
                              !canSelect ? "text-muted-foreground/25 cursor-not-allowed" :
                              isSelected ? "bg-primary text-primary-foreground font-bold shadow-sm" :
                              isToday ? "bg-primary/10 text-primary font-bold" :
                              "hover:bg-muted text-foreground"
                            }`}>
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time slots */}
                  {currentSession?.date && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {currentSession.date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                      </p>
                      {loadingBooked ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
                        </div>
                      ) : availTimes.length === 0 ? (
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">Sem horários disponíveis neste dia. Escolha outra data.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {availTimes.map(time => {
                            const isBooked = bookedTimes.includes(time);
                            const isSelected = currentSession.time === time;
                            return (
                              <button key={time}
                                disabled={isBooked}
                                onClick={() => !isBooked && handleTimeSelect(time)}
                                className={`relative px-4 py-2 rounded-xl text-sm font-medium border transition-all overflow-hidden ${
                                  isBooked
                                    ? "bg-muted/30 border-border/40 text-muted-foreground/30 cursor-not-allowed"
                                    : isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-card border-border hover:border-primary/50 hover:shadow-sm"
                                }`}>
                                {isBooked && (
                                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="absolute w-full h-px bg-muted-foreground/25 rotate-[-18deg]" />
                                  </span>
                                )}
                                <span className={isBooked ? "opacity-30" : ""}>{time}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="rounded-full gap-2"
                  onClick={() => planType ? window.history.back() : setStep(0)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button className="flex-1 rounded-full gap-2" disabled={!allPicked} onClick={() => setStep(2)}>Continuar <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Personal info ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { id: "name", label: "Nome completo", icon: User, value: clientName, set: setClientName, type: "text", placeholder: "Seu nome completo" },
                  { id: "email", label: "Email", icon: Mail, value: clientEmail, set: setClientEmail, type: "email", placeholder: "seu@email.com" },
                  { id: "phone", label: "WhatsApp (opcional)", icon: Phone, value: clientPhone, set: setClientPhone, type: "tel", placeholder: "(11) 99999-9999" },
                ].map(({ id, label, icon: Icon, value, set, type, placeholder }) => (
                  <div key={id} className="space-y-1.5">
                    <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
                    <div className="relative">
                      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id={id} type={type} value={value} onChange={e => set(e.target.value)} placeholder={placeholder} className="pl-9 rounded-xl" />
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="birthDate" className="text-sm font-medium">Data de nascimento</Label>
                    <Input id="birthDate" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sex" className="text-sm font-medium">Sexo biológico</Label>
                    <select id="sex" value={sex} onChange={e => setSex(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">Selecionar</option>
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full gap-2" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button className="flex-1 rounded-full gap-2"
                  disabled={!clientName.trim() || !clientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())}
                  onClick={() => setStep(3)}>
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Clinical info ── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-4 py-3">
                Essas informações ajudam a nutricionista a se preparar melhor para a sua consulta.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Objetivo principal</Label>
                  <select value={goal} onChange={e => setGoal(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Selecionar objetivo</option>
                    <option value="emagrecimento">Emagrecimento</option>
                    <option value="ganho_massa">Ganho de massa muscular</option>
                    <option value="saude_geral">Saúde geral e bem-estar</option>
                    <option value="condicao_especifica">Tratar condição específica</option>
                    <option value="gestante">Gestação / pós-parto</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Restrições alimentares</Label>
                  <select value={restrictions} onChange={e => setRestrictions(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Nenhuma</option>
                    <option value="vegetariano">Vegetariano</option>
                    <option value="vegano">Vegano</option>
                    <option value="sem_gluten">Sem glúten</option>
                    <option value="sem_lactose">Sem lactose</option>
                    <option value="outra">Outra</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Alergias alimentares <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input value={allergies} onChange={e => setAllergies(e.target.value)}
                    placeholder="Ex: amendoim, frutos do mar..." className="rounded-xl" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Condições de saúde <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input value={healthConditions} onChange={e => setHealthConditions(e.target.value)}
                    placeholder="Ex: diabetes, hipertensão, hipotireoidismo..." className="rounded-xl" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Medicamentos em uso <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input value={medications} onChange={e => setMedications(e.target.value)}
                    placeholder="Ex: metformina, levotiroxina..." className="rounded-xl" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Já fez acompanhamento nutricional?</Label>
                    <select value={hadNutritionist} onChange={e => setHadNutritionist(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">Selecionar</option>
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Como nos encontrou?</Label>
                    <select value={howFound} onChange={e => setHowFound(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">Selecionar</option>
                      <option value="instagram">Instagram</option>
                      <option value="indicacao">Indicação</option>
                      <option value="google">Google</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>
              </div>

                {/* Fotos corporais */}
                <div className="space-y-2 pt-1">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    Fotos corporais <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Envie fotos atuais para ajudar na avaliação inicial. Pedimos{" "}
                      <strong className="text-foreground">respeito e discrição</strong>:{" "}
                      mulheres de biquíni ou top + short; homens de short. Frente, lado e costas.
                    </p>
                    <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-background border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-medium text-muted-foreground hover:text-primary">
                      <Camera className="h-3.5 w-3.5" />
                      Selecionar fotos
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const picked = Array.from(e.target.files || []);
                          e.target.value = "";
                          setAnamnesisPhotos(prev => [...prev, ...picked].slice(0, 6));
                        }}
                      />
                    </label>
                    {anamnesisPhotos.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {anamnesisPhotos.map((f, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                            <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setAnamnesisPhotos(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center"
                            >
                              <X className="h-2.5 w-2.5 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full gap-2" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {isFree ? (
                  <Button
                    className="flex-1 rounded-full gap-2"
                    disabled={!goal || stage === "loading"}
                    onClick={handleFreeBooking}
                  >
                    {stage === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : <>Confirmar agendamento <CheckCircle2 className="h-4 w-4" /></>}
                  </Button>
                ) : (
                  <Button className="flex-1 rounded-full gap-2" disabled={!goal} onClick={() => setStep(4)}>
                    Continuar <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 4: Payment ── */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-muted/40 rounded-2xl px-4 py-3 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{plan.name}</span>
                <span className="font-bold text-primary">{plan.price}</span>
              </div>

              {/* PIX QR stage */}
              {stage === "pix_qr" && pixData && (
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  <p className="font-semibold text-sm text-center">Escaneie o QR Code ou copie o código</p>
                  {pixData.qr_code_base64 && (
                    <div className="flex justify-center">
                      <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Pix" className="w-48 h-48 rounded-xl border p-2 bg-white" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1 bg-muted rounded-xl px-3 py-2 text-xs font-mono truncate text-muted-foreground">{pixData.qr_code}</div>
                    <Button size="sm" variant={copied ? "default" : "outline"} className="rounded-xl shrink-0 gap-1.5" onClick={handleCopy}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-center gap-2 py-2 bg-primary/5 rounded-xl">
                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-primary" /></span>
                    <span className="text-sm text-primary font-medium">Aguardando pagamento...</span>
                  </div>
                  <button onClick={() => { if (pollingRef.current) clearInterval(pollingRef.current); setStage("idle"); setPixData(null); }}
                    className="w-full text-xs text-muted-foreground flex items-center justify-center gap-1 hover:text-foreground">
                    <X className="h-3 w-3" /> Cancelar
                  </button>
                </div>
              )}

              {/* Payment method tabs (idle/error/loading) */}
              {(stage === "idle" || stage === "error" || stage === "loading") && (
                <>
                  <div className="flex gap-2">
                    {([
                      { id: "pix" as const, label: "Pix", icon: QrCode },
                      { id: "card" as const, label: "Cartão de crédito", icon: CreditCard },
                    ]).map(({ id, label, icon: Icon }) => (
                      <button key={id} onClick={() => handlePayTabChange(id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          payTab === id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
                        }`}>
                        <Icon className="h-4 w-4" />{label}
                      </button>
                    ))}
                  </div>

                  {/* Pix tab */}
                  {payTab === "pix" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground text-center">Clique para gerar o QR Code Pix. A confirmação será enviada ao seu email após o pagamento.</p>
                      <Button className="w-full rounded-full gap-2" onClick={handlePixPayment} disabled={stage === "loading"}>
                        {stage === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" />Gerando Pix...</> : <><QrCode className="h-4 w-4" />Gerar QR Code Pix</>}
                      </Button>
                    </div>
                  )}

                  {/* Card tab */}
                  {payTab === "card" && (
                    <div>
                      {/* MP não configurado → redirecionar para WhatsApp */}
                      {!MP_PUBLIC_KEY ? (
                        <div className="bg-muted/40 border border-border rounded-2xl p-5 space-y-3 text-center">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">Pagamento via link de cartão</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              Enviaremos um link de pagamento seguro diretamente no WhatsApp para você pagar com cartão de crédito em até 12×.
                            </p>
                          </div>
                          <a
                            href={whatsappUrl(`Olá Dr. Fillipe! Gostaria de pagar o ${plan.name} (${plan.price}) com cartão de crédito. Pode me enviar o link de pagamento?`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Solicitar link de pagamento
                          </a>
                        </div>
                      ) : (!plan.priceAmount || plan.priceAmount <= 0) ? (
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3 text-center">
                          Pagamento por cartão não configurado para este plano. Use o Pix ou entre em contato.
                        </p>
                      ) : (
                        <>
                          {stage === "loading" && (
                            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                              <Loader2 className="h-4 w-4 animate-spin" /> Processando pagamento...
                            </div>
                          )}
                          <div id="mp-payment-brick" className={stage === "loading" ? "hidden" : ""} />
                        </>
                      )}
                    </div>
                  )}

                  {stage === "error" && (
                    <p className="text-xs text-destructive text-center">Ocorreu um erro. Tente novamente.</p>
                  )}
                </>
              )}

              <Button variant="outline" size="sm" className="rounded-full gap-2 w-full" onClick={() => setStep(3)}>
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border/50 py-5">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {identity.brandName} · {identity.doctorName}</p>
        </div>
      </footer>
    </div>
  );
};

const PageHeader = ({ brand }: { brand: string }) => (
  <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <span className="font-display font-bold text-primary text-sm">{brand}</span>
      <div className="w-16" />
    </div>
  </header>
);

export default BookingPage;
