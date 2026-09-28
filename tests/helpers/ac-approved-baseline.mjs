// User-approved baseline repair of pre-existing broken media references.
// Apply only these literal substitutions to the historical implementation.
export const approvedAcImages = [
  "/images/services/Air-conditioner-cleaning4.JPG",
  "/images/services/Air-conditioner-cleaning.PNG",
  "/images/services/Air-conditioner-cleaning2.PNG",
];
export const approvedAcGallery = [approvedAcImages[1], approvedAcImages[2], approvedAcImages[0]];
export function repairHistoricalAcMedia(file, source) {
  if (file.endsWith("src/components/AirConditionerCleaningLandingPage.tsx"))
    return source.replace("serviceImages.airConditioner.slice(1, 5)", `(${JSON.stringify(approvedAcGallery)})`)
      .replace("images={serviceImages.airConditioner}", `images={${JSON.stringify(approvedAcImages)}}`);
  if (file.endsWith("src/app/(site)/air-conditioner-cleaning/page.tsx"))
    return source.replace("serviceImages.airConditioner[0]", JSON.stringify(approvedAcImages[0]));
  return source;
}
