
import React from "react";
import "./BasketAnalysis.css";

const networks = [
  {
    title: "Product Association Network",
    description:
      "Explore relationships between bakery products and their purchase confidence.",
    file: "/basket-analysis/Basket_Network1.html",
  },
  {
    title: "Focused Product Network",
    description:
      "Explore a second view of product associations and frequently connected items.",
    file: "/basket-analysis/Basket_Network2.html",
  },
];

export default function BasketAnalysis() {
  return (
    <section className="basket-analysis">
      <div className="basket-heading">
        <span className="basket-eyebrow">CUSTOMER INSIGHTS</span>
        <h2>Basket Analysis</h2>
        <p>
          Discover which products are associated with one another
          to support product bundling and cross-selling decisions.
        </p>
      </div>

      <div className="basket-grid">
        {networks.map((network) => (
          <article className="basket-card" key={network.file}>
            <div className="basket-card-header">
              <div>
                <h3>{network.title}</h3>
                <p>{network.description}</p>
              </div>

              <a
                href={network.file}
                target="_blank"
                rel="noreferrer"
                className="basket-open-link"
              >
                Open graph ↗
              </a>
            </div>

            <iframe
              title={network.title}
              src={network.file}
              className="basket-frame"
              loading="lazy"
            />
          </article>
        ))}
      </div>
    </section>
  );
}
