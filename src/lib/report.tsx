import React from "react";
import path from "node:path";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Capa, ColorMeasurement, Defect, DensityMeasurement, Prisma } from "@/generated/prisma/client";
import { INSPECTION_STATUS_LABEL, PRINT_TYPE_LABEL, fmtDate } from "@/lib/domain";

const fontPath = path.join(process.cwd(), "node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff");
try {
  Font.register({ family: "Vazirmatn", src: fontPath });
} catch (error) {
  console.warn("Vazirmatn PDF font could not be registered; the PDF falls back to Helvetica.", error);
}

export type ReportInspection = Prisma.InspectionGetPayload<{
  include: {
    job: { include: { customer: true } };
    inspector: { select: { name: true } };
    colorMeasurements: true;
    densityMeasurements: true;
    registerMeasurement: true;
    adhesionTest: true;
    barcodeTest: true;
    defects: true;
    capas: true;
  };
}>;

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 9, fontFamily: "Vazirmatn", color: "#14233c", direction: "rtl" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, marginBottom: 15, borderBottomWidth: 2, borderBottomColor: "#1e40af" },
  brand: { fontSize: 18, color: "#1e40af", fontWeight: 700 },
  muted: { fontSize: 8, color: "#667085", marginTop: 3 },
  section: { marginTop: 12, padding: 10, borderWidth: 1, borderColor: "#e3e8f0", borderRadius: 6 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: "#1e40af", marginBottom: 7 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  label: { color: "#667085", width: "36%" },
  value: { color: "#14233c", width: "64%", textAlign: "right" },
  table: { borderWidth: 1, borderColor: "#e3e8f0", borderRadius: 4, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#eff6ff", padding: 6, fontWeight: 700 },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e3e8f0", padding: 6 },
  cell: { flex: 1, textAlign: "right" },
  score: { marginTop: 8, padding: 9, borderRadius: 5, backgroundColor: "#eff6ff", color: "#1e40af", fontSize: 13, fontWeight: 700, textAlign: "center" },
  chartTrack: { height: 8, backgroundColor: "#e7edf5", borderRadius: 4, marginTop: 4, marginBottom: 7 },
  chartFill: { height: 8, backgroundColor: "#2563eb", borderRadius: 4 },
  footer: { position: "absolute", bottom: 18, left: 34, right: 34, paddingTop: 7, borderTopWidth: 1, borderTopColor: "#e3e8f0", color: "#778198", fontSize: 7, textAlign: "center" },
  sign: { width: "30%", height: 46, borderBottomWidth: 1, borderBottomColor: "#98a2b3", paddingTop: 24, color: "#667085", textAlign: "center" },
});

const PersianStatus: Record<string, string> = {
  PASS: "تأیید",
  CONDITIONAL: "مشروط",
  FAIL: "رد شده",
};

function KV({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? "—"}</Text>
    </View>
  );
}

export async function buildInspectionPdf(data: ReportInspection): Promise<Buffer> {
  const statusColor = data.status === "PASS" ? "#15803d" : data.status === "FAIL" ? "#dc2626" : "#c2410c";
  const pdf = (
    <Document title={`گزارش QC ${data.job.jobNumber}`} author="QC Print Inspector" subject="گزارش کنترل کیفیت چاپ">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>گزارش کنترل کیفیت چاپ</Text>
            <Text style={styles.muted}>QC PRINT INSPECTOR · گزارش ثبت‌شده در سامانه</Text>
          </View>
          <View>
            <Text>شناسه: {data.id.slice(-10).toUpperCase()}</Text>
            <Text style={styles.muted}>تاریخ: {fmtDate(data.inspectionDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>اطلاعات سفارش و بازرسی</Text>
          <KV label="شماره سفارش" value={data.job.jobNumber} />
          <KV label="محصول" value={data.job.productName} />
          <KV label="مشتری" value={data.job.customer.name} />
          <KV label="فرایند چاپ" value={PRINT_TYPE_LABEL[data.job.printType] ?? data.job.printType} />
          <KV label="بستر چاپ" value={data.job.substrate} />
          <KV label="استاندارد/مرجع" value={data.job.targetStandard || "تعیین نشده"} />
          <KV label="مرحله بازرسی / بازرس" value={`${data.stage} · ${data.inspector.name}`} />
          <KV label="حجم نمونه / AQL" value={`${data.sampleSize} · ${data.aqlLevel || "ثبت نشده"}`} />
          <KV label="دمای محیط / رطوبت" value={`${data.environmentalTemp ?? "—"}°C · ${data.environmentalHumidity ?? "—"}%`} />
          <KV label="انطباق قانونی" value={data.legalCompliance} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>اندازه‌گیری رنگ — ΔE00</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.cell}>پچ</Text><Text style={styles.cell}>نوع</Text><Text style={styles.cell}>هدف Lab</Text><Text style={styles.cell}>اندازه‌گیری</Text><Text style={styles.cell}>ΔE00</Text><Text style={styles.cell}>نتیجه</Text>
            </View>
            {data.colorMeasurements.map((item: ColorMeasurement) => (
              <View style={styles.tableRow} key={item.id}>
                <Text style={styles.cell}>{item.patchName}</Text><Text style={styles.cell}>{item.patchType}</Text>
                <Text style={styles.cell}>{item.targetL.toFixed(1)}, {item.targetA.toFixed(1)}, {item.targetB.toFixed(1)}</Text>
                <Text style={styles.cell}>{item.measuredL.toFixed(1)}, {item.measuredA.toFixed(1)}, {item.measuredB.toFixed(1)}</Text>
                <Text style={styles.cell}>{item.deltaE00.toFixed(2)} / {item.tolerance.toFixed(2)}</Text>
                <Text style={styles.cell}>{item.isPass ? "قبول" : "رد"}</Text>
              </View>
            ))}
          </View>
          {data.colorMeasurements.map((item: ColorMeasurement) => (
            <View key={`bar-${item.id}`}>
              <Text style={styles.muted}>{item.patchName} · ΔE00 {item.deltaE00.toFixed(2)}</Text>
              <View style={styles.chartTrack}><View style={{ ...styles.chartFill, width: `${Math.min(100, (item.deltaE00 / Math.max(item.tolerance * 2, 0.1)) * 100)}%` }} /></View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>دانسیته و TVI</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}><Text style={styles.cell}>کانال</Text><Text style={styles.cell}>هدف</Text><Text style={styles.cell}>اندازه‌گیری</Text><Text style={styles.cell}>TVI</Text><Text style={styles.cell}>نتیجه</Text></View>
            {data.densityMeasurements.map((item: DensityMeasurement) => <View style={styles.tableRow} key={item.id}><Text style={styles.cell}>{item.colorChannel}</Text><Text style={styles.cell}>{item.targetDensity.toFixed(2)}</Text><Text style={styles.cell}>{item.measuredDensity.toFixed(2)}</Text><Text style={styles.cell}>{item.tvi ?? "—"}%</Text><Text style={styles.cell}>{item.isPass ? "قبول" : "رد"}</Text></View>)}
          </View>
          <View style={{ marginTop: 8 }}>
            <KV label="رجیستر" value={data.registerMeasurement ? `${data.registerMeasurement.measuredOffset.toFixed(2)} mm · حد ${data.registerMeasurement.tolerance.toFixed(2)} mm · ${data.registerMeasurement.isPass ? "قبول" : "رد"}` : "اندازه‌گیری نشده"} />
            <KV label="چسبندگی ASTM D3359" value={data.adhesionTest ? `${data.adhesionTest.rating} · ${data.adhesionTest.isPass ? "قبول" : "رد"}` : "آزمون نشده"} />
            <KV label="بارکد" value={data.barcodeTest ? `${data.barcodeTest.symbology} · گرید ${data.barcodeTest.grade} · ${data.barcodeTest.isPass ? "قبول" : "رد"}` : "آزمون نشده"} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>عیوب ثبت‌شده</Text>
          {data.defects.length ? data.defects.map((item: Defect) => <View style={styles.row} key={item.id}><Text style={styles.label}>{item.type} · {item.category}</Text><Text style={styles.value}>{item.description}{item.location ? ` — ${item.location}` : ""}</Text></View>) : <Text>عیبی در این بازرسی ثبت نشده است.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>نتیجه نهایی و CAPA</Text>
          <Text style={{ ...styles.score, color: statusColor }}>امتیاز {data.score.toFixed(1)} از ۱۰۰ · {PersianStatus[data.status] ?? INSPECTION_STATUS_LABEL[data.status]}</Text>
          {data.notes ? <Text style={{ marginTop: 8 }}>یادداشت: {data.notes}</Text> : null}
          {data.capas.length ? data.capas.map((item: Capa) => <View style={{ marginTop: 7 }} key={item.id}><Text>علت ریشه‌ای: {item.rootCause}</Text><Text>اقدام اصلاحی: {item.correctiveAction}</Text><Text>اقدام پیشگیرانه: {item.preventiveAction}</Text><Text>وضعیت: {item.status}</Text></View>) : <Text style={{ marginTop: 7 }}>CAPA مرتبط ثبت نشده است.</Text>}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
          <Text style={styles.sign}>امضای بازرس</Text><Text style={styles.sign}>تأیید سرپرست کیفیت</Text><Text style={styles.sign}>تأیید مشتری</Text>
        </View>
        <Text style={styles.footer} fixed>این گزارش بر اساس داده‌های واردشده تولید شده و به‌تنهایی گواهی انطباق قانونی، مهاجرت یا تماس غذایی نیست. · QC Print Inspector · صفحه ۱</Text>
      </Page>
    </Document>
  );
  return renderToBuffer(pdf);
}
