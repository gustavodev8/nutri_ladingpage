import { writeFileSync } from "node:fs";
import { generatePatientReportPdf } from "../../src/lib/generatePatientReportPdf";
import type { Patient, PatientReport } from "../../src/lib/supabase";

const patient: Patient = {
  id: 1,
  name: "Joseildo",
  birth_date: "2009-06-09",
  city: "Alagoinhas",
  email: "teste@example.com",
};

const report: PatientReport = {
  id: 1,
  patient_id: 1,
  title: "Relatorio 22/06/2026",
  report_date: "2026-06-23",
  report_text:
    "teste teste testeteste teste testetesteteste teste testeteste teste testeteste teste testetesteteste teste testeteste teste testeteste teste testetesteteste teste testeteste teste testeteste teste testetesteteste teste teste\n\n" +
    "Segundo paragrafo com uma linha bem longa para validar quebra: " +
    "abcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabc",
};

const doc = await generatePatientReportPdf(patient, report);
const out = Buffer.from(doc.output("arraybuffer"));
writeFileSync("tmp/pdfs/report-test.pdf", out);
console.log("written tmp/pdfs/report-test.pdf");
