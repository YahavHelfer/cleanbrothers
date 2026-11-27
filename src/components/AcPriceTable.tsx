import { formatLocalAcPrice, localAcPrices, localAcPriceTerms } from "@/content/local-ac-prices";

export function AcPriceTable() {
  return <>
    <p className="leading-7">{localAcPriceTerms}</p>
    <table className="w-full border-collapse text-start text-sm sm:text-base">
      <caption className="sr-only">שירותים ומחירי פתיחה כולל מע״מ</caption>
      <thead>
        <tr className="border-b">
          <th scope="col" className="py-2 pe-3 text-start">שירות</th>
          <th scope="col" className="py-2 text-start">מחיר פתיחה</th>
        </tr>
      </thead>
      <tbody>
        {Object.values(localAcPrices).map(({ service, amount }) => (
          <tr key={service} className="border-b">
            <th scope="row" className="py-2 pe-3 text-start font-medium">{service}</th>
            <td className="whitespace-nowrap py-2">{formatLocalAcPrice(amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </>;
}
