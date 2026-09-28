import type { PilotServiceId } from "./service-identity";

type Faq = { question: string; answer: string };
type RelatedLink = { label: string; href: string };
type ServiceVideo = {
  youtubeId: string;
  watchUrl: string;
  poster: string;
  title: string;
  description: string;
};
type BeforeAfter = {
  title: string;
  description: string;
  beforeImage: string;
  afterImage: string;
  beforeAlt: string;
  afterAlt: string;
};

// Existing renderer contract, moved out of the UI without changing its fields.
export type ServiceLandingConfig = {
  path: string;
  serviceName: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  image?: string;
  images?: readonly string[];
  imageAlt: string;
  mediaPresentation?: { heroAlts: Record<string,string>; benefitAlts: Record<string,string>; resultAlt: string };
  imagePosition?: string;
  imagePositions?: Record<string, string>;
  signsTitle: string;
  signsDescription: string;
  signs: string[];
  processTitle: string;
  processDescription: string;
  process: string[];
  benefitsDescription: string;
  benefits: string[];
  faqs: Faq[];
  relatedLinks: RelatedLink[];
  resultDescription: string;
  beforeAfter?: BeforeAfter;
  video?: ServiceVideo;
};

export interface ServiceLandingContent {
  readonly serviceId: PilotServiceId;
  readonly displayTitle: string;
  readonly content: Omit<ServiceLandingConfig, "serviceName">;
}

export interface ServiceLandingContentSource {
  getServiceLanding(serviceId: PilotServiceId): ServiceLandingContent;
}
