import { writeFileSync } from "node:fs";
import { generatePatientReportPdf } from "../../src/lib/generatePatientReportPdf";

const patient = {
  id: 1,
  name: "Joseildo",
  birth_date: "2009-06-09",
  city: "Alagoinhas",
  email: "teste@example.com",
} as any;

const report = {
  id: 1,
  patient_id: 1,
  title: "Relatorio 22/06/2026",
  report_date: "2026-06-23",
  report_text:
    "teste teste testeteste teste testetesteteste teste testeteste teste testeteste teste testetesteteste teste testeteste teste testeteste teste testetesteteste teste testeteste teste testeteste teste testetesteteste teste teste\n\n" +
    "Segundo paragrafo com uma linha bem longa para validar quebra: " +
    "abcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabc",
} as any;

const doc = generatePatientReportPdf(patient, report);
const out = Buffer.from(doc.output("arraybuffer"));
writeFileSync("tmp/pdfs/report-test.pdf", out);
console.log("written tmp/pdfs/report-test.pdf");
