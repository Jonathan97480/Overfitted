import type { Metadata } from "next";

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const productId = parseInt(slug, 10);

    if (isNaN(productId)) {
        return { title: "Produit introuvable — Overfitted.io" };
    }

    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/products/${productId}`,
            { next: { revalidate: 3600 } }
        );
        if (res.ok) {
            const data = await res.json();
            const product = data?.result?.sync_product;
            if (product) {
                return {
                    title: `${product.name} — Overfitted.io`,
                    description: `${product.name} — Critiqué par l'IA, réparé pour les Humains.`,
                    openGraph: {
                        title: product.name,
                        description: "Print-on-Demand satirique. Vos pixels en version corrigée.",
                        images: product.thumbnail_url
                            ? [{ url: product.thumbnail_url, width: 800, height: 800 }]
                            : [],
                    },
                };
            }
        }
    } catch {
        // fallback silencieux
    }

    return { title: "Produit — Overfitted.io" };
}

export default function ShopSlugLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
