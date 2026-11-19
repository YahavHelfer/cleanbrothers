import { validatePageDraft, type PageDraft } from "@/cms/pages/model";

// Code-owned launch content, using the same closed block schema as the CMS.
const pages: Record<string, unknown> = {
  "ac-mini-central-and-ducts": {
    "schemaVersion": 8,
    "publicTitle": "מה ההבדל בין ניקוי מזגן עילי, מיני מרכזי וניקוי תעלות?",
    "h1": "מה ההבדל בין ניקוי מזגן עילי, מיני מרכזי וניקוי תעלות?",
    "seoTitle": "ניקוי מזגן עילי, מיני מרכזי ותעלות — מה ההבדל? | CleanBrothers",
    "seoDescription": "מה כלול בניקוי מזגן עילי, מה כולל ניקוי מיני מרכזי ב־450 ₪ ומתי ניקוי תעלות הוא תוספת נפרדת? הסבר קצר עם מחירים כולל מע״מ.",
    "canonical": "/ac-mini-central-and-ducts",
    "blocks": [
      {
        "id": "aacd084f-9587-4343-8fa1-75cf7736448e",
        "position": 0,
        "type": "hero",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "eyebrow": "מדריכי CleanBrothers",
          "title": "מה ההבדל בין ניקוי מזגן עילי, מיני מרכזי וניקוי תעלות?",
          "description": "המונח ״ניקוי מזגנים״ יכול לתאר כמה עבודות שונות. כדי להזמין את השירות המתאים, צריך להבחין בין ניקוי מזגן עילי, ניקוי המערכת של מזגן מיני מרכזי וניקוי התעלות שלה. ניקוי הפתחים אינו בהכרח ניקוי התעלות, וגם מחיר ניקוי המערכת אינו כולל אותן אוטומטית.",
          "cta": null,
          "mediaAlt": null
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "7afd86c5-63b1-4772-b753-0f6ef30b2563",
        "position": 1,
        "type": "richText",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "nodes": [
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "מאת צוות CleanBrothers",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "ניקוי מזגן עילי",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "השירות מיועד למזגן העילי וממוקד בחלקים הנגישים לניקוי מקצועי: פילטרים, סוללת המאייד, תריסים ופתחי האוויר, חלקי הפלסטיקה ואזורים נגישים במפוח ובניקוז. המבנה והגישה למזגן קובעים את היקף העבודה האפשרי.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "ניקוי מזגן עילי בכל הספק עולה ",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": "199 ₪",
                    "bold": true,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": " ליחידה, כולל מע״מ.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "פרטים ותיאום ניקוי מזגן עילי",
                    "bold": false,
                    "emphasis": false,
                    "link": {
                      "kind": "internal",
                      "path": "/air-conditioner-cleaning"
                    }
                  },
                  {
                    "text": ".",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "ניקוי מערכת מיני מרכזית",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "בניקוי מיני מרכזי בודקים את הגישה למערכת ומתאמים את היקף העבודה. השירות המוצע של CleanBrothers כולל ניקוי מנוע, מאייד, פתחים ופילטרים במחיר של ",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": "450 ₪ כולל מע״מ",
                    "bold": true,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": ", בכפוף לבדיקת הגישה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "חשוב להדגיש: המחיר הזה מתייחס לניקוי המערכת כפי שתוארה, ואינו כולל ניקוי תעלות.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "ניקוי תעלות",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "ניקוי תעלות הוא עבודה נפרדת מניקוי המנוע, המאייד או הפתחים. ב־CleanBrothers ניתן להזמין אותו כתוספת לניקוי המיני מרכזי, במחיר של ",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": "250 ₪ לכל התעלות יחד כולל מע״מ",
                    "bold": true,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": ", באמצעות מברשת ייעודית ושואב תעשייתי. מספר התעלות והיקף העבודה מסוכמים לפני התיאום.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "לכן, אם ביקשתם ״ניקוי מיני מרכזי״ והתכוונתם גם לתעלות, כדאי לומר זאת במפורש. כך אפשר לבדוק את ההתאמה ולסכם מחיר שמייצג את העבודה המבוקשת.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "דוגמה לחישוב מחיר",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "אם לאחר בדיקת ההתאמה סוכם על ניקוי מערכת מיני מרכזית וכל התעלות יחד כתוספת, החישוב הוא:",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "450 ₪ למערכת + 250 ₪ לכל התעלות יחד = 700 ₪ כולל מע״מ.",
                    "bold": true,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "התוספת היא לכל התעלות יחד, ואינה מחושבת לכל תעלה בנפרד. לפני התיאום בודקים את מספר התעלות, הגישה והיקף העבודה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "איך יודעים מה להזמין?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "שלחו תמונה של המזגן או של פתח הגישה וציינו מה תרצו לנקות. במיני מרכזי, כתבו אם הפנייה היא למערכת בלבד או גם לתעלות. אם קיימת תקלה טכנית, ציינו אותה בנפרד: ניקוי אינו תחליף לתיקון מזגן ואינו מבטיח פתרון לכל נזילה, רעש או ריח.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "אפשר ",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": "להשאיר שם וטלפון לתיאום ניקוי מיני מרכזי",
                    "bold": false,
                    "emphasis": false,
                    "link": {
                      "kind": "internal",
                      "path": "/mini-central-air-conditioner-cleaning"
                    }
                  },
                  {
                    "text": ", גם בלי תמונה, ונברר יחד את הפרטים.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            }
          ]
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "b47730e4-a8ed-43ce-9ac2-94e12b900266",
        "position": 2,
        "type": "cta",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "heading": "נבדוק יחד איזה ניקוי מתאים לכם",
          "description": "אפשר לפנות דרך עמוד השירות, או להשאיר פרטים ונחזור אליכם לתיאום.",
          "cta": {
            "label": "לפרטים ותיאום השירות",
            "target": {
              "kind": "internal",
              "path": "/mini-central-air-conditioner-cleaning"
            }
          }
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      }
    ]
  },
  "before-booking-ac-cleaning": {
    "schemaVersion": 8,
    "publicTitle": "מה חשוב לדעת לפני שמזמינים ניקוי מזגן לבית?",
    "h1": "מה חשוב לדעת לפני שמזמינים ניקוי מזגן לבית?",
    "seoTitle": "מה חשוב לדעת לפני שמזמינים ניקוי מזגן לבית? | CleanBrothers",
    "seoDescription": "איזה ניקוי מתאים למזגן שלכם, מה כלול במחיר ואילו פרטים כדאי לשלוח לפני התיאום? מדריך קצר להזמנת ניקוי מזגן עילי או מיני מרכזי.",
    "canonical": "/before-booking-ac-cleaning",
    "blocks": [
      {
        "id": "cccc7ccd-5c4c-4733-bacb-efc03b6062e4",
        "position": 0,
        "type": "hero",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "eyebrow": "מדריכי CleanBrothers",
          "title": "מה חשוב לדעת לפני שמזמינים ניקוי מזגן לבית?",
          "description": "לפני שקובעים ניקוי מזגן, כדאי לברר שלושה דברים: איזה סוג מזגן יש בבית, אילו חלקים ינוקו ומהו המחיר של העבודה שסוכמה. תמונה של המזגן ושל הגישה אליו יכולה לעזור לנו להתאים את השירות, אבל אפשר גם להשאיר שם וטלפון ולברר את הפרטים בשיחה.",
          "cta": null,
          "mediaAlt": null
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "cc56757e-db4a-497d-8852-c6db8ec801d3",
        "position": 1,
        "type": "richText",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "nodes": [
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "מאת צוות CleanBrothers",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "1. לזהות את סוג המזגן",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "ניקוי מזגן עילי וניקוי מערכת מיני מרכזית הם שירותים שונים. אם מדובר במיני מרכזי, חשוב לציין האם הפנייה נוגעת לניקוי המערכת, לניקוי התעלות או לשניהם. גם במערכת מיני מרכזית, ניקוי התעלות אינו בהכרח חלק מניקוי היחידה עצמה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "לא בטוחים מה יש אצלכם? שלחו תמונה של המזגן או של פתח הגישה, ונבדוק יחד איזה שירות מתאים.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "2. להבין מה כלול בעבודה",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "בניקוי מזגן עילי של CleanBrothers מטפלים בחלקים הנגישים לניקוי, ובהם פילטרים, סוללת המאייד, תריסים ופתחי האוויר, חלקי הפלסטיקה ואזורי הניקוז והמפוח הנגישים. היקף העבודה בפועל תלוי במבנה המזגן ובגישה לחלקים.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "בניקוי מיני מרכזי השירות המוצע כולל ניקוי מנוע, מאייד, פתחים ופילטרים, בכפוף לבדיקת הגישה. ניקוי תעלות מתומחר בנפרד. אפשר לקרוא את ",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": "ההסבר המלא על ניקוי מיני מרכזי",
                    "bold": false,
                    "emphasis": false,
                    "link": {
                      "kind": "internal",
                      "path": "/mini-central-air-conditioner-cleaning"
                    }
                  },
                  {
                    "text": ".",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "3. לאשר מחיר לפי המזגן והעבודה",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "המחירים המפורסמים של CleanBrothers, כולל מע״מ:",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "unordered",
              "level": null,
              "items": [
                [
                  {
                    "text": "ניקוי מזגן עילי בכל הספק: ",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": "199 ₪",
                    "bold": true,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": ".",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ],
                [
                  {
                    "text": "ניקוי מערכת מיני מרכזית: ",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": "450 ₪",
                    "bold": true,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": ", בכפוף לבדיקת גישה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ],
                [
                  {
                    "text": "ניקוי תעלות כתוספת: ",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": "250 ₪ לכל התעלות יחד",
                    "bold": true,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": ", כתוספת לניקוי המערכת, בכפוף לבדיקת גישה ולהיקף העבודה שסוכם.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "לפני התיאום מאשרים את סוג המזגן ואת העבודה המבוקשת. אם יש כמה מזגנים בבית, ציינו את כולם כדי שנוכל לבדוק את היקף הביקור מראש.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "4. להסביר גם מה מפריע לכם",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "ציינו אם הפנייה היא בגלל לכלוך נראה לעין, ריח בזמן ההפעלה או מזגן שלא נוקה זמן רב. אם קיימת גם תקלה, כמו אי־קירור, רעש חריג או נזילה, חשוב לציין אותה בנפרד.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "ניקוי אינו תחליף לאבחון תקלה טכנית, ואיננו מבטיח תיקון תקלות או העלמת כל ריח. ייתכן שיהיה צורך בטכנאי מזגנים, בהתאם לבעיה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "5. לבדוק את הגישה לפני הביקור",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "שלחו את היישוב ותמונה שמראה את מיקום המזגן. במיני מרכזי כדאי להראות גם את פתח הגישה ואת סביבתו. ציינו אם הגישה מוגבלת, כדי שנוכל לבדוק את ההתאמה לפני קביעת מועד.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "בהמשך לתיאום, פנו חפצים שעלולים להפריע להגעה למזגן. אין צורך לפרק בעצמכם כיסויים או חלקים כדי לצלם.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "מוכנים לבדוק התאמה?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "אפשר ",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": "להשאיר פרטים לתיאום ניקוי מזגן",
                    "bold": false,
                    "emphasis": false,
                    "link": {
                      "kind": "internal",
                      "path": "/air-conditioner-cleaning"
                    }
                  },
                  {
                    "text": ", או לפנות דרך כפתור ה־WhatsApp בעמוד השירות. אין לכם תמונה כרגע? השאירו שם וטלפון ונחזור לבירור הפרטים.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            }
          ]
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "e1edecfe-0786-47aa-8761-6cb7738438d7",
        "position": 2,
        "type": "cta",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "heading": "נבדוק יחד איזה ניקוי מתאים לכם",
          "description": "אפשר לפנות דרך עמוד השירות, או להשאיר פרטים ונחזור אליכם לתיאום.",
          "cta": {
            "label": "לפרטים ותיאום השירות",
            "target": {
              "kind": "internal",
              "path": "/air-conditioner-cleaning"
            }
          }
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      }
    ]
  },
  "guides": {
    "schemaVersion": 8,
    "publicTitle": "מדריכים לניקוי הבית",
    "h1": "מדריכים לניקוי הבית",
    "seoTitle": "מדריכים לניקוי הבית ולבחירת השירות | CleanBrothers",
    "seoDescription": "מדריכים של CleanBrothers לניקוי ספות, מזגנים וניקיון לפני אכלוס ואחרי שיפוץ. מחירים, הכנות ומה כלול בכל שירות.",
    "canonical": "/guides",
    "blocks": [
      {
        "id": "1f0f9cf0-fec4-4d34-9da2-189638e74d59",
        "position": 0,
        "type": "hero",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "eyebrow": "מידע לפני שמזמינים",
          "title": "מדריכים לניקוי הבית",
          "description": "תשובות קצרות שיעזרו להבין את השירות, לבדוק מה כלול במחיר ולהגיע לתיאום עם הפרטים הנכונים.",
          "cta": null,
          "mediaAlt": null
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "4fc6a776-6b92-4e07-8fe6-4653f66946bd",
        "position": 1,
        "type": "richText",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "nodes": [
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "המדריכים מרכזים מידע על סוגי ניקוי, מחירים והכנה לתיאום. בחרו את הנושא שמעניין אתכם; בכל מדריך תמצאו גם קישור לשירות המתאים.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            }
          ]
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      }
    ]
  },
  "after-renovation-cleaning-checklist": {
    "schemaVersion": 8,
    "publicTitle": "ניקיון אחרי שיפוץ: מה לבדוק לפני שמזמינים?",
    "h1": "ניקיון אחרי שיפוץ: מה לבדוק לפני שמזמינים?",
    "seoTitle": "ניקיון אחרי שיפוץ: רשימת בדיקה לפני הזמנה | CleanBrothers",
    "seoDescription": "מה לתאם לפני ניקיון אחרי שיפוץ: היקף עבודה, שאריות בנייה, תמחור והכנת הנכס. מדריך קצר של צוות CleanBrothers.",
    "canonical": "/after-renovation-cleaning-checklist",
    "blocks": [
      {
        "id": "75111018-bcd0-4b4e-a861-1ccb2d9a0d50",
        "position": 0,
        "type": "hero",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "eyebrow": "מדריכי CleanBrothers",
          "title": "ניקיון אחרי שיפוץ: מה לבדוק לפני שמזמינים?",
          "description": "השיפוץ מסתיים, אבל הדירה עדיין דורשת ניקיון לפני הכניסה. כדי לקבל הצעת מחיר שמתאימה לנכס, כדאי להציג את מצב הדירה ולתאם מה כלול בעבודה. המדריך מרכז את הפרטים שכדאי להכין ואת השאלות שיעזרו למנוע אי־הבנות.",
          "cta": null,
          "mediaAlt": null
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "5e51c5bf-128c-416b-804d-cb83ced9e900",
        "position": 1,
        "type": "richText",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "nodes": [
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "מאת צוות CleanBrothers",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "מתי כדאי לתאם את הניקיון?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "תאמו את מועד הניקיון ביחס לסיום העבודות שמייצרות אבק ולכלוך ולמועד הכנסת הרהיטים. אם נותרו עבודות של בעלי מקצוע, ציינו זאת מראש. נכס פנוי מאפשר גישה טובה יותר לרצפות ולאזורים שיהיו מוסתרים בהמשך.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "אילו פרטים שולחים לקבלת הצעה?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "unordered",
              "level": null,
              "items": [
                [
                  {
                    "text": "היישוב, גודל משוער של הנכס ומספר החדרים.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ],
                [
                  {
                    "text": "אילו עבודות שיפוץ בוצעו, והאם נשארו שאריות צבע, דבק או חומרי בנייה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ],
                [
                  {
                    "text": "סוגי הרצפות והמשטחים, ככל שהם ידועים, ותמונות של האזורים הרלוונטיים.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ],
                [
                  {
                    "text": "האם הנכס ריק, האם יש מים וחשמל ומהם תנאי הגישה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ],
                [
                  {
                    "text": "מועד הכניסה הרצוי והאם נדרשת התייחסות לחלונות, מסילות או ארונות.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "מה חשוב שיופיע בהיקף העבודה?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "בקשו פירוט של האזורים שנכללים בהצעה: רצפות, פנלים, משטחים נגישים, מטבח וחדרי רחצה לפי מצב הנכס. בררו בנפרד לגבי חלונות ומסילות, פנים ארונות, פוליש או טיפול בשאריות בנייה. עצם הכותרת „ניקיון אחרי שיפוץ” אינה מפרט אחיד לכל דירה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "האם כל שארית בנייה ניתנת להסרה?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "האפשרות לטפל בצבע, רובה, דבק או חומר אחר תלויה גם במשטח שעליו הם נמצאים. ציינו שאריות בולטות ושלחו תמונות לפני התיאום. אין להניח שניקיון רגיל כולל כל טיפול או שהסרה מלאה אפשרית ללא בדיקה. אין צורך לנסות חומרים או לגרד בעצמכם לצורך קבלת ההצעה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "איך נקבע מחיר הניקיון?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "גודל הדירה הוא רק חלק מהתמונה. גם מצב הלכלוך, סוגי המשטחים, הגישה והאזורים שנכללים משפיעים על ההצעה. כדאי להשוות הצעות לפי אותו היקף עבודה ולברר מה כלול במחיר שסוכם.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "לקראת ביקור הצוות",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "עדכנו אם השתנה מצב הדירה מאז ששלחתם תמונות. ודאו שהאזורים שסוכמו נגישים, ושיש נקודת מים וחשמל. תיאום ציפיות לפני העבודה ומעבר מסכם אחריה עוזרים לבדוק שהאזורים שסוכמו קיבלו מענה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "לתיאום הצעה לנכס שלכם",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "אפשר לקרוא על ",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": "ניקיון אחרי שיפוץ ולפני אכלוס",
                    "bold": false,
                    "emphasis": false,
                    "link": {
                      "kind": "internal",
                      "path": "/post-renovation-cleaning"
                    }
                  },
                  {
                    "text": ", להשאיר שם וטלפון ולציין יישוב, גודל משוער ומועד כניסה. תמונות יכולות לעזור לדייק את ההצעה; אפשר להתחיל גם בשיחה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            }
          ]
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "e01b2fa5-2ef6-4c48-82fc-61f296000bc6",
        "position": 2,
        "type": "cta",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "heading": "מתאמים ניקיון לפי הנכס שלכם",
          "description": "השאירו יישוב, גודל משוער ומועד כניסה מבוקש, ונחזור לבירור ההיקף והצעת מחיר.",
          "cta": {
            "label": "לפרטים והצעת מחיר",
            "target": {
              "kind": "internal",
              "path": "/post-renovation-cleaning"
            }
          }
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      }
    ]
  },
  "before-moving-in-cleaning": {
    "schemaVersion": 8,
    "publicTitle": "ניקיון לפני אכלוס: איך מתכוננים לכניסה לדירה?",
    "h1": "ניקיון לפני אכלוס: איך מתכוננים לכניסה לדירה?",
    "seoTitle": "ניקיון לפני אכלוס: הכנה לדירה חדשה או יד שנייה | CleanBrothers",
    "seoDescription": "איך מתכוננים לניקיון לפני כניסה לדירה: תזמון, מה כלול בהצעה, חלונות, ארונות ופרטים לתיאום עם CleanBrothers.",
    "canonical": "/before-moving-in-cleaning",
    "blocks": [
      {
        "id": "1391bb46-8ccc-4999-aa43-2a7f8faa8fe9",
        "position": 0,
        "type": "hero",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "eyebrow": "מדריכי CleanBrothers",
          "title": "ניקיון לפני אכלוס: איך מתכוננים לכניסה לדירה?",
          "description": "לפני שמכניסים רהיטים וארגזים, כדאי להגדיר אילו אזורים בדירה תרצו לנקות ומה דורש תשומת לב מיוחדת. דירה חדשה מקבלן ודירה יד שנייה עשויות לדרוש היקף עבודה שונה. כך מתכוננים לתיאום ניקיון לפני אכלוס.",
          "cta": null,
          "mediaAlt": null
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "628403ef-0345-44c6-a253-7806a17a4056",
        "position": 1,
        "type": "richText",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "nodes": [
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "מאת צוות CleanBrothers",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "דירה חדשה או דירה יד שנייה?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "בדירה חדשה כדאי לציין אם נשארו אבק או שאריות מעבודות גמר. בדירה יד שנייה תארו את מצב הנכס ואת האזורים שחשוב לכם לנקות. אם בוצע גם שיפוץ, ציינו אילו עבודות נעשו. מצב הדירה בפועל עוזר להתאים את ההצעה יותר מהכותרת „דירה חדשה” או „ניקיון יסודי”.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "מתי לנקות ביחס למעבר?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "מומלץ לתאם את הניקיון למועד שבו אפשר להגיע לאזורים שסוכמו. כשהדירה פנויה, קל יותר להגיע לרצפות ולפינות. אם רהיטים או חפצים כבר נמצאים בנכס, עדכנו מראש מה נגיש והאם צפויות עוד עבודות שייצרו לכלוך.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "רשימת פרטים קצרה לתיאום",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "unordered",
              "level": null,
              "items": [
                [
                  {
                    "text": "יישוב, גודל הנכס ומספר החדרים.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ],
                [
                  {
                    "text": "מועד כניסה רצוי והאם הדירה תהיה פנויה בזמן הניקיון.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ],
                [
                  {
                    "text": "האם מדובר בדירה חדשה, יד שנייה או דירה שעברה שיפוץ.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ],
                [
                  {
                    "text": "אזורים חשובים במיוחד: מטבח, חדרי רחצה, רצפות, חלונות או מסילות.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ],
                [
                  {
                    "text": "גישה לנכס, נקודת מים וחשמל, ומידע על חניה קרובה אם יש.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "מה כלול ומה צריך לבקש במפורש?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "תאמו מראש את האזורים ואת היקף העבודה בכל אחד מהם. חלונות נגישים, מסילות ופנים ארונות אינם בהכרח כלולים בכל הצעה. גם פוליש וטיפול בשאריות צבע או חומרי בנייה דורשים בירור נפרד. אל תניחו שמחיר כולל כל פעולה אפשרית בדירה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "האם יש מחיר קבוע לניקיון לפני אכלוס?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "הצעת המחיר תלויה בגודל הנכס, במצבו, במשטחים ובהיקף העבודה. שליחת תמונות ופרטים מאפשרת לדייק את הבירור. בעת השוואת הצעות, בדקו שהן מתייחסות לאותם אזורים ושהתוספות שסוכמו ברורות.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "מה מכינים לפני ההגעה?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "פנו חפצים שמפריעים לגישה לאזורים שסוכמו, ודאגו לזמינות מים וחשמל. עדכנו אם מועד המעבר או מצב הדירה השתנו. אם נותרו עבודות קבלן, הבהירו אילו עבודות יסתיימו לפני הניקיון ואילו יימשכו אחריו.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "מאיפה מתחילים?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "בעמוד ",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  },
                  {
                    "text": "ניקיון אחרי שיפוץ ולפני אכלוס",
                    "bold": false,
                    "emphasis": false,
                    "link": {
                      "kind": "internal",
                      "path": "/post-renovation-cleaning"
                    }
                  },
                  {
                    "text": " אפשר להשאיר פרטים או לפנות ב־WhatsApp. בחרו בטופס „ניקיון לפני אכלוס” כדי שהצוות ידע במה מדובר, וציינו יישוב, גודל משוער ותאריך כניסה מבוקש.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            }
          ]
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "88c4e473-3b5d-4ce8-8ff0-6799bc596f41",
        "position": 2,
        "type": "cta",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "heading": "מתאמים ניקיון לפי הנכס שלכם",
          "description": "השאירו יישוב, גודל משוער ומועד כניסה מבוקש, ונחזור לבירור ההיקף והצעת מחיר.",
          "cta": {
            "label": "לפרטים והצעת מחיר",
            "target": {
              "kind": "internal",
              "path": "/post-renovation-cleaning"
            }
          }
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      }
    ]
  },
  "sofa-cleaning-price": {
    "schemaVersion": 8,
    "publicTitle": "כמה עולה ניקוי ספה ומה משפיע על המחיר?",
    "h1": "כמה עולה ניקוי ספה ומה משפיע על המחיר?",
    "seoTitle": "כמה עולה ניקוי ספה ומה משפיע על המחיר? | CleanBrothers",
    "seoDescription": "ניקוי ספת בד מתחיל ב־300 ₪ כולל מע״מ. כך בודקים מה כלול בהצעה ואילו תמונות לשלוח כדי לקבל מחיר לספה שלכם.",
    "canonical": "/sofa-cleaning-price",
    "blocks": [
      {
        "id": "abbb442a-03b4-4f79-a854-1acdef000000",
        "position": 0,
        "type": "hero",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "eyebrow": "מדריכי CleanBrothers",
          "title": "כמה עולה ניקוי ספה ומה משפיע על המחיר?",
          "description": "ניקוי ספת בד מתחיל ב־300 ₪ כולל מע״מ. כך בודקים מה כלול בהצעה ואילו תמונות לשלוח כדי לקבל מחיר לספה שלכם.",
          "cta": null,
          "mediaAlt": null
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "abbb442a-03b4-4f79-a854-1acdef000001",
        "position": 1,
        "type": "richText",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "nodes": [
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "מה משפיע על המחיר של הספה שלכם?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "ב־CleanBrothers ניקוי ספת בד מתחיל ב־300 ₪ כולל מע״מ. ספרו לנו כמה מושבים יש בספה ואם יש שזלונג, הדום או כריות נפרדות. שתי ספות שמוגדרות כשלושה מושבים יכולות להיות שונות מאוד בגודל ובשטח הריפוד.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "איזו תמונה עוזרת לקבל מחיר מדויק?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "צלמו את הספה כולה מהחזית, כולל הידיות והשזלונג. הוסיפו תקריב של האזור שדורש תשומת לב ותצלום של תווית הבד אם היא זמינה. אם ניסיתם לנקות כתם, ספרו לנו במה השתמשתם. כך נוכל להעריך את היקף העבודה ולהסביר מראש מה סביר שישתפר.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "מה כדאי להשוות בין הצעות מחיר?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "בדקו אם המחיר כולל את גב הספה, שני צדדים של כריות נשלפות ואת ההדום, אם יש כזה. ציינו את היישוב ותנאי הגישה ובקשו מחיר כולל מע״מ עבור הפריטים שסיכמתם. אם כתם מסוים הוא הסיבה להזמנה, כדאי לשאול עליו במפורש לפני שקובעים.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            }
          ]
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "abbb442a-03b4-4f79-a854-1acdef000002",
        "position": 2,
        "type": "cta",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "heading": "רוצים הצעת מחיר לספה שלכם?",
          "description": "שלחו תמונה של הספה, מספר מושבים ושם היישוב. נבדוק יחד מה מתאים לריפוד שלכם.",
          "cta": {
            "label": "לפרטי השירות ולהצעת מחיר לניקוי ספות",
            "target": {
              "kind": "internal",
              "path": "/sofa-cleaning"
            }
          }
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      }
    ]
  },
  "sofa-cleaning-at-home": {
    "schemaVersion": 8,
    "publicTitle": "ניקוי ספות בבית: איך מתכוננים ומתי אפשר לשבת שוב?",
    "h1": "ניקוי ספות בבית: איך מתכוננים ומתי אפשר לשבת שוב?",
    "seoTitle": "ניקוי ספות בבית: איך מתכוננים ומתי אפשר לשבת שוב? | CleanBrothers",
    "seoDescription": "מה לפנות לפני שהצוות מגיע, מה חשוב לספר על הבד והכתמים, וכמה זמן להשאיר לייבוש הספה אחרי ניקוי בבית.",
    "canonical": "/sofa-cleaning-at-home",
    "blocks": [
      {
        "id": "abbb442a-03b4-4f79-a854-1acdef000010",
        "position": 0,
        "type": "hero",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "eyebrow": "מדריכי CleanBrothers",
          "title": "ניקוי ספות בבית: איך מתכוננים ומתי אפשר לשבת שוב?",
          "description": "מה לפנות לפני שהצוות מגיע, מה חשוב לספר על הבד והכתמים, וכמה זמן להשאיר לייבוש הספה אחרי ניקוי בבית.",
          "cta": null,
          "mediaAlt": null
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "abbb442a-03b4-4f79-a854-1acdef000011",
        "position": 1,
        "type": "richText",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "nodes": [
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "מה להכין לפני ההגעה?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "פנו צעצועים, שמיכות וחפצים קטנים מהספה ומהרצפה שלידה, והשאירו מעבר לציוד. ציינו מראש אם יש מדרגות או גישה צרה. אם משקה נשפך על כרית אחת, צלמו את האזור וספרו מתי זה קרה.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "איך מתאימים את הניקוי לבד?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "אם יש תווית טיפול מתחת לכרית או לגוף הספה, השאירו אותה נגישה. הראו לצוות כתמים ישנים, אזורים דהויים או קרעים, וציינו אילו חומרי ניקוי כבר נוסו. לפני תחילת העבודה סכמו אילו כריות ומשטחים כלולים ואיזו תוצאה אפשר לצפות לקבל מהריפוד הקיים.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "heading",
              "level": 2,
              "items": [
                [
                  {
                    "text": "כמה זמן לשריין לעבודה ולייבוש?",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            },
            {
              "kind": "paragraph",
              "level": null,
              "items": [
                [
                  {
                    "text": "לספה סטנדרטית כדאי לשריין כ־40–60 דקות לעבודה ועוד כ־4–6 שעות לייבוש. גודל הספה, עובי הריפוד והאוורור בבית משפיעים על הזמן בפועל. השאירו את הספה מאווררת ובדקו גם את התפרים והכריות לפני ישיבה או החזרת כיסוי.",
                    "bold": false,
                    "emphasis": false,
                    "link": null
                  }
                ]
              ]
            }
          ]
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      },
      {
        "id": "abbb442a-03b4-4f79-a854-1acdef000012",
        "position": 2,
        "type": "cta",
        "schemaVersion": 1,
        "hidden": false,
        "payload": {
          "heading": "רוצים הצעת מחיר לספה שלכם?",
          "description": "שלחו תמונה של הספה, מספר מושבים ושם היישוב. נבדוק יחד מה מתאים לריפוד שלכם.",
          "cta": {
            "label": "לפרטי השירות ולהצעת מחיר לניקוי ספות",
            "target": {
              "kind": "internal",
              "path": "/sofa-cleaning"
            }
          }
        },
        "mediaVersionId": null,
        "promotionRevisionId": null
      }
    ]
  }
};

export function getCodeGuidePage(slug: string): PageDraft | null {
  return Object.hasOwn(pages, slug) ? validatePageDraft(pages[slug]) : null;
}
