import { ContentValidationError } from "./pilot-model";
import type { SpecialServiceKey } from "@/content/service-registry";
export type SpecialMediaInput = {
    versionId: string;
    alt: string;
};
export type AirConditionerCleaningContent = {
    schemaVersion: 4;
    publicTitle: string;
    h1: string;
    seoTitle: string;
    seoDescription: string;
    copy: {
        heroEyebrow: string;
        heroDescription: string;
        heroCta: string;
        callCta: string;
        imageCaption: string;
        signsEyebrow: string;
        signsTitle: string;
        signsDescription: string;
        cleaningEyebrow: string;
        cleaningTitle: string;
        cleaningDescription: string;
        cleaningNote: string;
        technicalTitle: string;
        technicalDescription: string;
        processEyebrow: string;
        processTitle: string;
        processDescription: string;
        processCta: string;
        galleryEyebrow: string;
        galleryTitle: string;
        galleryDescription: string;
        pricingEyebrow: string;
        pricingTitle: string;
        pricingDescription: string;
        pricingCta: string;
        multipleEyebrow: string;
        multipleTitle: string;
        multipleDescription: string;
        multipleCta: string;
        areasEyebrow: string;
        areasTitle: string;
        areasDescription: string;
        faqEyebrow: string;
        faqTitle: string;
        contactEyebrow: string;
        contactTitle: string;
        contactDescription: string;
        contactCta: string;
        callPrefix: string;
        servicesCta: string;
    };
    trustItems: string[];
    airConditionerServiceAreas: string[];
    intentSignals: string[];
    cleaningAreas: {
        title: string;
        description: string;
    }[];
    processSteps: string[];
    faqs: {
        question: string;
        answer: string;
    }[];
    serviceDescription: string;
    keywords: string[];
    media: {
        hero: {
            versionId: string;
            alt: string;
        }[];
        gallery: {
            versionId: string;
            alt: string;
        }[];
        seo: {
            versionId: string;
            alt: string;
        }[];
    };
    promotion: {
        enabled: boolean;
        startingPrice: number;
        regularPrice: number;
        bundleEnabled: boolean;
        badge: string;
        heroLabel: string;
        pricePrefix: string;
        description: string;
        cta: string;
        priceTerms: string;
        bundleTerms: string;
    };
};
export type WindowCleaningContent = {
    schemaVersion: 5;
    publicTitle: string;
    h1: string;
    seoTitle: string;
    seoDescription: string;
    copy: {
        heroEyebrow: string;
        heroDescription: string;
        heroCta: string;
        includedEyebrow: string;
        includedTitle: string;
        includedDescription: string;
        propertyEyebrow: string;
        propertyTitle: string;
        processEyebrow: string;
        processTitle: string;
        audienceEyebrow: string;
        audienceTitle: string;
        audienceDescription: string;
        safetyEyebrow: string;
        safetyTitle: string;
        safetyDescription: string;
        faqEyebrow: string;
        faqTitle: string;
        contactEyebrow: string;
        contactTitle: string;
        contactDescription: string;
        callPrefix: string;
        callCta: string;
        quoteCta: string;
    };
    includedItems: string[];
    propertyTypes: {
        title: string;
        text: string;
    }[];
    process: string[];
    faqs: {
        question: string;
        answer: string;
    }[];
    media: {
        hero: SpecialMediaInput[];
    };
};
export type SpecialContent = AirConditionerCleaningContent | WindowCleaningContent;
export type Contract = {
    kind: "text";
    max: number;
} | {
    kind: "uuid";
} | {
    kind: "number";
    min: number;
    max: number;
} | {
    kind: "boolean";
} | {
    kind: "literal";
    value: number;
} | {
    kind: "list";
    min: number;
    max: number;
    item: Contract;
} | {
    kind: "object";
    fields: Record<string, Contract>;
};
export const specialContracts: Record<SpecialServiceKey, Contract> = {
    "air-conditioner-cleaning": {
        "kind": "object",
        "fields": {
            "schemaVersion": {
                "kind": "literal",
                "value": 4
            },
            "publicTitle": {
                "kind": "text",
                "max": 180
            },
            "h1": {
                "kind": "text",
                "max": 180
            },
            "seoTitle": {
                "kind": "text",
                "max": 180
            },
            "seoDescription": {
                "kind": "text",
                "max": 500
            },
            "copy": {
                "kind": "object",
                "fields": {
                    "heroEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "heroDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "heroCta": {
                        "kind": "text",
                        "max": 2000
                    },
                    "callCta": {
                        "kind": "text",
                        "max": 2000
                    },
                    "imageCaption": {
                        "kind": "text",
                        "max": 2000
                    },
                    "signsEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "signsTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "signsDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "cleaningEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "cleaningTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "cleaningDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "cleaningNote": {
                        "kind": "text",
                        "max": 2000
                    },
                    "technicalTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "technicalDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "processEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "processTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "processDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "processCta": {
                        "kind": "text",
                        "max": 2000
                    },
                    "galleryEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "galleryTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "galleryDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "pricingEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "pricingTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "pricingDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "pricingCta": {
                        "kind": "text",
                        "max": 2000
                    },
                    "multipleEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "multipleTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "multipleDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "multipleCta": {
                        "kind": "text",
                        "max": 2000
                    },
                    "areasEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "areasTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "areasDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "faqEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "faqTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "contactEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "contactTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "contactDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "contactCta": {
                        "kind": "text",
                        "max": 2000
                    },
                    "callPrefix": {
                        "kind": "text",
                        "max": 2000
                    },
                    "servicesCta": {
                        "kind": "text",
                        "max": 2000
                    }
                }
            },
            "trustItems": {
                "kind": "list",
                "min": 1,
                "max": 20,
                "item": {
                    "kind": "text",
                    "max": 2000
                }
            },
            "airConditionerServiceAreas": {
                "kind": "list",
                "min": 1,
                "max": 20,
                "item": {
                    "kind": "text",
                    "max": 2000
                }
            },
            "intentSignals": {
                "kind": "list",
                "min": 1,
                "max": 20,
                "item": {
                    "kind": "text",
                    "max": 2000
                }
            },
            "cleaningAreas": {
                "kind": "list",
                "min": 1,
                "max": 20,
                "item": {
                    "kind": "object",
                    "fields": {
                        "title": {
                            "kind": "text",
                            "max": 2000
                        },
                        "description": {
                            "kind": "text",
                            "max": 2000
                        }
                    }
                }
            },
            "processSteps": {
                "kind": "list",
                "min": 1,
                "max": 20,
                "item": {
                    "kind": "text",
                    "max": 2000
                }
            },
            "faqs": {
                "kind": "list",
                "min": 1,
                "max": 20,
                "item": {
                    "kind": "object",
                    "fields": {
                        "question": {
                            "kind": "text",
                            "max": 2000
                        },
                        "answer": {
                            "kind": "text",
                            "max": 2000
                        }
                    }
                }
            },
            "serviceDescription": {
                "kind": "text",
                "max": 2000
            },
            "keywords": {
                "kind": "list",
                "min": 1,
                "max": 20,
                "item": {
                    "kind": "text",
                    "max": 2000
                }
            },
            "media": {
                "kind": "object",
                "fields": {
                    "hero": {
                        "kind": "list",
                        "min": 1,
                        "max": 8,
                        "item": {
                            "kind": "object",
                            "fields": {
                                "versionId": {
                                    "kind": "uuid"
                                },
                                "alt": {
                                    "kind": "text",
                                    "max": 300
                                }
                            }
                        }
                    },
                    "gallery": {
                        "kind": "list",
                        "min": 1,
                        "max": 8,
                        "item": {
                            "kind": "object",
                            "fields": {
                                "versionId": {
                                    "kind": "uuid"
                                },
                                "alt": {
                                    "kind": "text",
                                    "max": 300
                                }
                            }
                        }
                    },
                    "seo": {
                        "kind": "list",
                        "min": 1,
                        "max": 1,
                        "item": {
                            "kind": "object",
                            "fields": {
                                "versionId": {
                                    "kind": "uuid"
                                },
                                "alt": {
                                    "kind": "text",
                                    "max": 300
                                }
                            }
                        }
                    }
                }
            },
            "promotion": {
                "kind": "object",
                "fields": {
                    "enabled": {
                        "kind": "boolean"
                    },
                    "startingPrice": {
                        "kind": "number",
                        "min": 1,
                        "max": 10000
                    },
                    "regularPrice": {
                        "kind": "number",
                        "min": 1,
                        "max": 10000
                    },
                    "bundleEnabled": {
                        "kind": "boolean"
                    },
                    "badge": {
                        "kind": "text",
                        "max": 2000
                    },
                    "heroLabel": {
                        "kind": "text",
                        "max": 2000
                    },
                    "pricePrefix": {
                        "kind": "text",
                        "max": 2000
                    },
                    "description": {
                        "kind": "text",
                        "max": 2000
                    },
                    "cta": {
                        "kind": "text",
                        "max": 2000
                    },
                    "priceTerms": {
                        "kind": "text",
                        "max": 2000
                    },
                    "bundleTerms": {
                        "kind": "text",
                        "max": 2000
                    }
                }
            }
        }
    },
    "window-cleaning": {
        "kind": "object",
        "fields": {
            "schemaVersion": {
                "kind": "literal",
                "value": 5
            },
            "publicTitle": {
                "kind": "text",
                "max": 180
            },
            "h1": {
                "kind": "text",
                "max": 180
            },
            "seoTitle": {
                "kind": "text",
                "max": 180
            },
            "seoDescription": {
                "kind": "text",
                "max": 500
            },
            "copy": {
                "kind": "object",
                "fields": {
                    "heroEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "heroDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "heroCta": {
                        "kind": "text",
                        "max": 2000
                    },
                    "includedEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "includedTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "includedDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "propertyEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "propertyTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "processEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "processTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "audienceEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "audienceTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "audienceDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "safetyEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "safetyTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "safetyDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "faqEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "faqTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "contactEyebrow": {
                        "kind": "text",
                        "max": 2000
                    },
                    "contactTitle": {
                        "kind": "text",
                        "max": 2000
                    },
                    "contactDescription": {
                        "kind": "text",
                        "max": 2000
                    },
                    "callPrefix": {
                        "kind": "text",
                        "max": 2000
                    },
                    "callCta": {
                        "kind": "text",
                        "max": 2000
                    },
                    "quoteCta": {
                        "kind": "text",
                        "max": 2000
                    }
                }
            },
            "includedItems": {
                "kind": "list",
                "min": 1,
                "max": 20,
                "item": {
                    "kind": "text",
                    "max": 2000
                }
            },
            "propertyTypes": {
                "kind": "list",
                "min": 1,
                "max": 20,
                "item": {
                    "kind": "object",
                    "fields": {
                        "title": {
                            "kind": "text",
                            "max": 2000
                        },
                        "text": {
                            "kind": "text",
                            "max": 2000
                        }
                    }
                }
            },
            "process": {
                "kind": "list",
                "min": 1,
                "max": 20,
                "item": {
                    "kind": "text",
                    "max": 2000
                }
            },
            "faqs": {
                "kind": "list",
                "min": 1,
                "max": 20,
                "item": {
                    "kind": "object",
                    "fields": {
                        "question": {
                            "kind": "text",
                            "max": 2000
                        },
                        "answer": {
                            "kind": "text",
                            "max": 2000
                        }
                    }
                }
            },
            "media": {
                "kind": "object",
                "fields": {
                    "hero": {
                        "kind": "list",
                        "min": 0,
                        "max": 1,
                        "item": {
                            "kind": "object",
                            "fields": {
                                "versionId": {
                                    "kind": "uuid"
                                },
                                "alt": {
                                    "kind": "text",
                                    "max": 300
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
export function matchesContract(c: Contract, value: unknown): boolean {
    switch (c.kind) {
        case "text": return typeof value === "string" && !!value.trim() && [...value].length <= c.max && !/[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value);
        case "uuid": return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
        case "number": return typeof value === "number" && Number.isSafeInteger(value) && value >= c.min && value <= c.max;
        case "boolean": return typeof value === "boolean";
        case "literal": return value === c.value;
        case "list": return Array.isArray(value) && value.length >= c.min && value.length <= c.max && value.every(v => matchesContract(c.item, v));
        case "object": return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === Object.keys(c.fields).length && Object.entries(c.fields).every(([k, f]) => Object.hasOwn(value, k) && matchesContract(f, (value as Record<string, unknown>)[k]));
    }
}
export function validateSpecialContent(key: SpecialServiceKey, value: unknown): SpecialContent {
    if (!matchesContract(specialContracts[key], value))
        throw new ContentValidationError();
    const result = value as SpecialContent;
    for (const items of Object.values(result.media))
        if (new Set(items.map(i => i.versionId)).size !== items.length)
            throw new ContentValidationError();
    if (result.schemaVersion === 4 && result.promotion.startingPrice > result.promotion.regularPrice)
        throw new ContentValidationError();
    return result;
}
