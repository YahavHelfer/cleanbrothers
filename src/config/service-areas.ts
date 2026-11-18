// Explicit locality targets in the three active Google Ads campaigns, verified 2026-11-18.
// District and radius targets do not imply service at every address in their boundaries.
const sharedAreas = [
  "ראש העין",
  "פתח תקווה",
  "תל אביב-יפו",
  "רמת גן",
  "גבעתיים",
  "בני ברק",
  "קריית אונו",
  "אור יהודה",
  "יהוד-מונוסון",
  "סביון",
  "מגשימים",
  "שוהם",
  "דרום השרון",
  "הוד השרון",
  "כפר סבא",
  "רעננה",
  "הרצליה",
  "רמת השרון",
  "כוכב יאיר–צור יגאל",
];

const areasForAcCampaigns = [
  "בת ים",
  "חולון",
  "ראשון לציון",
  "נס ציונה",
  "רחובות",
  "באר יעקב",
  "מודיעין-מכבים-רעות",
  "נחלים",
  "נתניה",
  "אבן יהודה",
  "קדימה-צורן",
  "תל מונד",
  "חוף השרון",
];

export const sofaServiceAreas = sharedAreas;
export const wallMountedAcServiceAreas = [
  ...sharedAreas,
  ...areasForAcCampaigns,
  "כפר יונה",
];
export const miniCentralServiceAreas = [
  ...sharedAreas,
  ...areasForAcCampaigns,
  "גן רווה",
  "יבנה",
];

export const publicServiceAreas = [...new Set([...wallMountedAcServiceAreas, ...miniCentralServiceAreas])];
