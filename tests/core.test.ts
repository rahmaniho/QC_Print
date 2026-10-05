import test from "node:test";
import assert from "node:assert/strict";
import { cmykToRgb, deltaE00, deltaE76, rgbToLab, scoreInspection, type Lab } from "../src/lib/domain";

const referencePairs: Array<{ first: Lab; second: Lab; expected: number }> = [
  { first: { L: 50, a: 2.6772, b: -79.7751 }, second: { L: 50, a: 0, b: -82.7485 }, expected: 2.0425 },
  { first: { L: 50, a: 3.1571, b: -77.2803 }, second: { L: 50, a: 0, b: -82.7485 }, expected: 2.8615 },
  { first: { L: 50, a: 2.8361, b: -74.02 }, second: { L: 50, a: 0, b: -82.7485 }, expected: 3.4412 },
  { first: { L: 50, a: -1.3802, b: -84.2814 }, second: { L: 50, a: 0, b: -82.7485 }, expected: 1 },
  { first: { L: 50, a: -1.1848, b: -84.8006 }, second: { L: 50, a: 0, b: -82.7485 }, expected: 1 },
  { first: { L: 50, a: -0.9009, b: -85.5211 }, second: { L: 50, a: 0, b: -82.7485 }, expected: 1 },
  { first: { L: 50, a: 0, b: 0 }, second: { L: 50, a: -1, b: 2 }, expected: 2.3669 },
  { first: { L: 50, a: -1, b: 2 }, second: { L: 50, a: 0, b: 0 }, expected: 2.3669 },
  { first: { L: 50, a: 2.49, b: -0.001 }, second: { L: 50, a: -2.49, b: 0.0009 }, expected: 7.1792 },
  { first: { L: 50, a: 2.49, b: -0.001 }, second: { L: 50, a: -2.49, b: 0.001 }, expected: 7.1792 },
  { first: { L: 50, a: 2.49, b: -0.001 }, second: { L: 50, a: -2.49, b: 0.0011 }, expected: 7.2195 },
  { first: { L: 50, a: 2.49, b: -0.001 }, second: { L: 50, a: -2.49, b: 0.0012 }, expected: 7.2195 },
  { first: { L: 50, a: -0.001, b: 2.49 }, second: { L: 50, a: 0.0009, b: -2.49 }, expected: 4.8045 },
  { first: { L: 50, a: -0.001, b: 2.49 }, second: { L: 50, a: 0.0001, b: -2.49 }, expected: 4.8045 },
  { first: { L: 50, a: -0.001, b: 2.49 }, second: { L: 50, a: 0.0011, b: -2.49 }, expected: 4.7461 },
  { first: { L: 50, a: 2.5, b: 0 }, second: { L: 50, a: 0, b: -2.5 }, expected: 4.3065 },
  { first: { L: 50, a: 2.5, b: 0 }, second: { L: 73, a: 25, b: -18 }, expected: 27.1492 },
  { first: { L: 50, a: 2.5, b: 0 }, second: { L: 61, a: -5, b: 29 }, expected: 22.8977 },
  { first: { L: 50, a: 2.5, b: 0 }, second: { L: 56, a: -27, b: -3 }, expected: 31.903 },
  { first: { L: 50, a: 2.5, b: 0 }, second: { L: 58, a: 24, b: 15 }, expected: 19.4535 },
  { first: { L: 50, a: 2.5, b: 0 }, second: { L: 50, a: 3.1736, b: 0.5854 }, expected: 1 },
  { first: { L: 50, a: 2.5, b: 0 }, second: { L: 50, a: 3.2972, b: 0 }, expected: 1 },
  { first: { L: 50, a: 2.5, b: 0 }, second: { L: 50, a: 1.8634, b: 0.5757 }, expected: 1 },
  { first: { L: 50, a: 2.5, b: 0 }, second: { L: 50, a: 3.2592, b: 0.335 }, expected: 1 },
  { first: { L: 60.2574, a: -34.0099, b: 36.2677 }, second: { L: 60.4626, a: -34.1751, b: 39.4387 }, expected: 1.2644 },
  { first: { L: 63.0109, a: -31.0961, b: -5.8663 }, second: { L: 62.8187, a: -29.7946, b: -4.0864 }, expected: 1.263 },
  { first: { L: 61.2901, a: 3.7196, b: -5.3901 }, second: { L: 61.4292, a: 2.248, b: -4.962 }, expected: 1.8731 },
  { first: { L: 35.0831, a: -44.1164, b: 3.7933 }, second: { L: 35.0232, a: -40.0716, b: 1.5901 }, expected: 1.8645 },
  { first: { L: 22.7233, a: 20.0904, b: -46.694 }, second: { L: 23.0331, a: 14.973, b: -42.5619 }, expected: 2.0373 },
  { first: { L: 36.4612, a: 47.858, b: 18.3852 }, second: { L: 36.2715, a: 50.5065, b: 21.2231 }, expected: 1.4146 },
  { first: { L: 90.8027, a: -2.0831, b: 1.441 }, second: { L: 91.1528, a: -1.6435, b: 0.0447 }, expected: 1.4441 },
  { first: { L: 90.9257, a: -0.5406, b: -0.9208 }, second: { L: 88.6381, a: -0.8985, b: -0.7239 }, expected: 1.5381 },
  { first: { L: 6.7747, a: -0.2908, b: -2.4247 }, second: { L: 5.8714, a: -0.0985, b: -2.2286 }, expected: 0.6377 },
  { first: { L: 2.0776, a: 0.0795, b: -1.135 }, second: { L: 0.9033, a: -0.0636, b: -0.5514 }, expected: 0.9082 },
];

test("CIEDE2000 matches all 34 Sharma, Wu & Dalal supplementary pairs", () => {
  assert.equal(referencePairs.length, 34);
  for (const [index, pair] of referencePairs.entries()) {
    assert.ok(Math.abs(deltaE00(pair.first, pair.second) - pair.expected) <= 0.0001, `reference pair ${index + 1}`);
  }
});

test("CIEDE2000 is symmetric for sample pairs, including hue-wrap cases", () => {
  for (const pair of referencePairs) assert.ok(Math.abs(deltaE00(pair.first, pair.second) - deltaE00(pair.second, pair.first)) < 1e-10);
});

test("CIE76 and approximate RGB/CMYK conversions return expected basic values", () => {
  assert.equal(deltaE76({ L: 0, a: 0, b: 0 }, { L: 100, a: 0, b: 0 }), 100);
  const white = rgbToLab(255, 255, 255);
  assert.ok(Math.abs(white.L - 100) < 0.001 && Math.abs(white.a) < 0.01 && Math.abs(white.b) < 0.01);
  assert.deepEqual(cmykToRgb(0, 0, 0, 0), { r: 255, g: 255, b: 255 });
  assert.deepEqual(cmykToRgb(0, 0, 0, 100), { r: 0, g: 0, b: 0 });
});

const passing = {
  colorMeasurements: [{ patchName: "Black", patchType: "SOLID" as const, targetL: 50, targetA: 0, targetB: 0, measuredL: 50.2, measuredA: 0.1, measuredB: -0.1, tolerance: 2 }],
  densityMeasurements: [{ colorChannel: "K" as const, targetDensity: 1.5, measuredDensity: 1.51, tvi: 1 }],
  registerMeasurement: { targetOffset: 0, measuredOffset: 0.05, tolerance: 0.2 },
  adhesionTest: { rating: "5B" as const },
  barcodeTest: { symbology: "Code 128", grade: "A" as const },
  defects: [],
  legalCompliance: "VERIFIED" as const,
};

test("scoreInspection passes complete measurements and exposes full coverage", () => {
  const result = scoreInspection(passing);
  assert.equal(result.status, "PASS");
  assert.equal(result.score, 100);
  assert.equal(result.coverage, 100);
});

test("critical defects and confirmed legal non-compliance are immediate failures", () => {
  const defect = scoreInspection({ ...passing, defects: [{ type: "CRITICAL" as const, category: "بارکد", description: "بارکد ناخوانا" }] });
  const legal = scoreInspection({ ...passing, legalCompliance: "NON_COMPLIANT" });
  assert.equal(defect.status, "FAIL");
  assert.equal(legal.status, "FAIL");
});

test("missing evidence or out-of-tolerance metrics cannot produce a Pass", () => {
  const pending = scoreInspection({ ...passing, legalCompliance: "PENDING" });
  const colorFail = scoreInspection({ ...passing, colorMeasurements: [{ ...passing.colorMeasurements[0]!, measuredA: 7 }] });
  const missingBarcode = scoreInspection({ ...passing, barcodeTest: { symbology: "Code 128", grade: "NOT_TESTED" } });
  const missingDensity = scoreInspection({ ...passing, densityMeasurements: [] });
  const missingRegister = scoreInspection({ ...passing, registerMeasurement: undefined });
  assert.equal(pending.status, "CONDITIONAL");
  assert.equal(colorFail.status, "CONDITIONAL");
  assert.equal(missingBarcode.status, "CONDITIONAL");
  assert.equal(missingDensity.status, "CONDITIONAL");
  assert.equal(missingDensity.coverage, 85);
  assert.equal(missingRegister.status, "CONDITIONAL");
});

test("explicitly out-of-scope legal review is documented without a false compliance claim", () => {
  const result = scoreInspection({ ...passing, legalCompliance: "NOT_APPLICABLE" });
  assert.equal(result.status, "PASS");
  assert.equal(result.coverage, 100);
});
