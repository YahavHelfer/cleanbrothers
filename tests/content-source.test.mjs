import assert from "node:assert/strict";
import test from "node:test";
import { createSourceLoader, elementTree, plain } from "./helpers/source-module.mjs";

const load = createSourceLoader();
const { contentSource } = load("src/content/source.ts");
const { staticContentSource } = load("src/content/static-source.ts");
const { toServiceLandingProps } = load("src/content/service-landing-adapter.ts");
const { getCrmServiceName } = load("src/content/service-identity.ts");
const { delicateUpholsteryLanding, sofaLanding } = load("src/data/serviceLandingPages.ts");
const { serviceOptions } = load("src/data/site.ts");
const { ServiceLandingPage, buildServiceLandingMetadata } = load("src/components/ServiceLandingPage.tsx");
const { ContactForm } = load("src/components/ContactForm.tsx");
const serviceId = "delicate-upholstery-cleaning";
const existingCrmValue = "ניקוי ריפודים עדינים";

test("the static adapter is the active and only pilot content source", () => {
  assert.equal(contentSource, staticContentSource);
  const page = contentSource.getServiceLanding(serviceId);
  assert.equal(page.serviceId, serviceId);
  assert.equal(page.displayTitle, delicateUpholsteryLanding.serviceName);
  assert.equal(Object.hasOwn(page.content, "serviceName"), false);
  assert.deepEqual(plain(toServiceLandingProps(page).config), plain(delicateUpholsteryLanding));
});

test("pilot page uses the static adapter and preserves existing SEO metadata", () => {
  const route = load("src/app/(site)/delicate-upholstery-cleaning/page.tsx");
  const page = route.default();
  assert.equal(page.type, ServiceLandingPage);
  assert.deepEqual(plain(page.props.config), plain(delicateUpholsteryLanding));
  assert.equal(page.props.crmServiceName, existingCrmValue);
  assert.deepEqual(plain(route.metadata), plain(buildServiceLandingMetadata(delicateUpholsteryLanding)));
});

test("renaming pilot display text cannot change the service submitted through ContactForm", () => {
  const page = contentSource.getServiceLanding(serviceId);
  const renamed = { ...page, displayTitle: "כותרת תצוגה אחרת" };
  const props = toServiceLandingProps(renamed);
  assert.equal(props.config.serviceName, renamed.displayTitle);
  assert.equal(props.crmServiceName, existingCrmValue);
  assert.equal(getCrmServiceName(serviceId), existingCrmValue);
  assert.ok(serviceOptions.includes(existingCrmValue), "the existing form accepts the unchanged CRM value");
  const forms = elementTree(ServiceLandingPage(props)).filter((node) => node.type === ContactForm);
  assert.equal(forms.length, 1);
  assert.equal(forms[0].props.initialService, existingCrmValue);
  assert.equal(contentSource.getServiceLanding(serviceId).displayTitle, delicateUpholsteryLanding.serviceName);
});

test("unmigrated services retain their existing form service value", () => {
  const form = elementTree(ServiceLandingPage({ config: sofaLanding }))
    .find((node) => node.type === ContactForm);
  assert.equal(form.props.initialService, sofaLanding.serviceName);
});

test("unknown service identities fail instead of falling back to editable text", () => {
  for (const unknown of ["unknown", "__proto__", "constructor"]) {
    assert.throws(() => getCrmServiceName(unknown), /Unsupported service identity/);
    assert.throws(() => contentSource.getServiceLanding(unknown), /Unsupported static service/);
  }
});
