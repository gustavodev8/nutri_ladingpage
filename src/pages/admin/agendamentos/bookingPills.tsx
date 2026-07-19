import { PAYMENT_STATUS, STATUS } from "./bookingStatusUtils";

export const StatusPill = ({ status }: { status: string }) => {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
      {s.label}
    </span>
  );
};

export const PaymentPill = ({ status }: { status: string }) => {
  const s = PAYMENT_STATUS[status] || PAYMENT_STATUS.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
      {s.label}
    </span>
  );
};
