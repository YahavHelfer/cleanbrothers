export const serviceImages = {
  sofa: [
    "/images/services/sofa-cleaning.png",
    "/images/services/sofa-cleaning2.png",
    "/images/services/sofa-cleaning5.png",
    "/images/services/sofa-cleaning6.png",
  ],
  mattress: ["/images/services/mattress-cleaning.jpeg"],
  carpet: ["/images/services/carpet-cleaning.jpeg"],
  carUpholstery: [
    "/images/services/car-upholstery-cleaning.png",
    "/images/services/car-upholstery-cleaning2.png",
  ],
  airConditioner: [
    "/images/services/air-conditioner-cleaning-web.jpg",
    "/images/services/Air-conditioner-cleaning.PNG",
    "/images/services/Air-conditioner-cleaning2.PNG",
    "/images/services/Air-conditioner-cleaning4.JPG",
    "/images/services/Air-conditioner-cleaning5.JPG",
  ],
  armchairChair: ["/images/services/armchair-chair-cleaning.jpeg"],
  delicateUpholstery: [
    "/images/services/delicate-upholstery-cleaning.jpeg",
  ],
} satisfies Record<string, string[]>;

export const sofaImagePositions = {
  "/images/services/sofa-cleaning.png": "object-[center_48%]",
  "/images/services/sofa-cleaning2.png": "object-[58%_center]",
  "/images/services/sofa-cleaning5.png": "object-center",
  "/images/services/sofa-cleaning6.png": "object-[52%_center]",
} satisfies Record<string, string>;
