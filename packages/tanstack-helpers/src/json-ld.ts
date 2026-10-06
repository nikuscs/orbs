// oxlint-disable max-lines -- Single source of truth for all JSON-LD schema factories; intentionally co-located.
import type * as SchemaDtsTypes from 'schema-dts';

export type TanstackJsonLdSchema = SchemaDtsTypes.WithContext<SchemaDtsTypes.Thing>

export interface TanstackJsonLdOrganizationContactPoint {
  email?: string
  telephone?: string
  contactType?: string
  areaServed?: string | string[]
  availableLanguage?: string | string[]
}

export interface TanstackJsonLdOrganizationParams {
  id?: string
  name: string
  legalName?: string
  url: string
  logo?: string
  description?: string
  sameAs?: string[]
  aggregateRating?: TanstackJsonLdAggregateRatingParams
  reviews?: TanstackJsonLdProductReview[]
  contactPoints?: TanstackJsonLdOrganizationContactPoint[]
}

export interface TanstackJsonLdWebApplicationParams {
  id?: string
  name: string
  url: string
  description: string
  applicationCategory?: string
  operatingSystem?: string
}

export interface TanstackJsonLdWebSiteParams {
  id?: string
  name: string
  url: string
  description?: string
  inLanguage?: string
  publisherId?: string
}

export interface TanstackJsonLdSoftwareApplicationParams {
  id?: string
  name: string
  url: string
  description: string
  applicationCategory?: string
  operatingSystem?: string
  offers?: SchemaDtsTypes.Offer[]
}

export interface TanstackJsonLdFaqItem {
  title: string
  content: string
}

export interface TanstackJsonLdHowToStep {
  name: string
  text: string
}

export interface TanstackJsonLdHowToParams {
  name: string
  description?: string
  steps: TanstackJsonLdHowToStep[]
}

export interface TanstackJsonLdAggregateRatingParams {
  ratingValue: number
  reviewCount: number
  bestRating?: number
  worstRating?: number
}

export interface TanstackJsonLdProductReview {
  author: string
  rating: number
  date: string
  title?: string
  content: string
}

export interface TanstackJsonLdAuthorParams {
  name: string
  url?: string
  avatar?: string
}

export interface TanstackJsonLdArticleParams {
  headline: string
  description: string
  url: string
  siteName: string
  siteUrl: string
  siteLogo?: string
  datePublished?: string
  dateModified?: string
  author?: TanstackJsonLdAuthorParams
  image?: string
  wordCount?: number
  keywords?: string[]
  language?: string
}

export interface TanstackJsonLdBreadcrumbItem {
  name: string
  url: string
}

export interface TanstackJsonLdWebPageParams {
  name: string
  description: string
  url: string
  siteName: string
  siteUrl: string
  datePublished?: string
  dateModified?: string
}

export function toReviewSchema(review: TanstackJsonLdProductReview): SchemaDtsTypes.Review {
  return {
    '@type': 'Review',
    author: { '@type': 'Person', name: review.author },
    reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 },
    datePublished: review.date,
    name: review.title,
    reviewBody: review.content,
  };
}

/** Build an Organization schema. */
export function createOrganizationSchema(params: TanstackJsonLdOrganizationParams): SchemaDtsTypes.WithContext<SchemaDtsTypes.Organization> {
  const reviewSchemas = params.reviews?.map(toReviewSchema);

  const contactPointSchemas = params.contactPoints?.map((contact) => ({
    '@type': 'ContactPoint' as const,
    email: contact.email,
    telephone: contact.telephone,
    contactType: contact.contactType ?? 'customer support',
    areaServed: contact.areaServed,
    availableLanguage: contact.availableLanguage,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': params.id,
    name: params.name,
    legalName: params.legalName,
    url: params.url,
    logo: params.logo,
    description: params.description,
    sameAs: params.sameAs,
    contactPoint: contactPointSchemas,
    aggregateRating: params.aggregateRating
      ? {
        '@type': 'AggregateRating',
        ratingValue: params.aggregateRating.ratingValue,
        reviewCount: params.aggregateRating.reviewCount,
        bestRating: params.aggregateRating.bestRating ?? 5,
        worstRating: params.aggregateRating.worstRating ?? 1,
      }
      : undefined,
    review: reviewSchemas,
  };
}

/** Build a WebSite schema. */
export function createWebSiteSchema(params: TanstackJsonLdWebSiteParams): SchemaDtsTypes.WithContext<SchemaDtsTypes.WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': params.id,
    name: params.name,
    url: params.url,
    description: params.description,
    inLanguage: params.inLanguage,
    publisher: params.publisherId
      ? {
        '@id': params.publisherId,
      }
      : undefined,
  };
}

/** Build a WebApplication schema. */
export function createWebApplicationSchema(params: TanstackJsonLdWebApplicationParams): SchemaDtsTypes.WithContext<SchemaDtsTypes.WebApplication> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': params.id,
    name: params.name,
    url: params.url,
    description: params.description,
    applicationCategory: params.applicationCategory,
    operatingSystem: params.operatingSystem,
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

/** Build a SoftwareApplication schema. */
export function createSoftwareApplicationSchema(
  params: TanstackJsonLdSoftwareApplicationParams,
): SchemaDtsTypes.WithContext<SchemaDtsTypes.SoftwareApplication> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': params.id,
    name: params.name,
    url: params.url,
    description: params.description,
    applicationCategory: params.applicationCategory,
    operatingSystem: params.operatingSystem,
    offers: params.offers,
  };
}

/** Build an FAQPage schema. */
export function createFaqSchema(faqs: TanstackJsonLdFaqItem[]): SchemaDtsTypes.WithContext<SchemaDtsTypes.FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.title,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.content,
      },
    })),
  };
}

/** Build a HowTo schema. */
export function createHowToSchema(params: TanstackJsonLdHowToParams): SchemaDtsTypes.WithContext<SchemaDtsTypes.HowTo> {
  const steps: SchemaDtsTypes.HowToStep[] = params.steps.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: step.name,
    text: step.text,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: params.name,
    description: params.description,
    step: steps,
  };
}

/** Build a standalone AggregateRating schema. */
export function createAggregateRatingSchema(params: TanstackJsonLdAggregateRatingParams): SchemaDtsTypes.WithContext<SchemaDtsTypes.AggregateRating> {
  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    ratingValue: params.ratingValue,
    reviewCount: params.reviewCount,
    bestRating: params.bestRating ?? 5,
    worstRating: params.worstRating ?? 1,
  };
}

/** Build an Article schema. */
export function createArticleSchema(params: TanstackJsonLdArticleParams): SchemaDtsTypes.WithContext<SchemaDtsTypes.Article> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.headline,
    description: params.description,
    mainEntityOfPage: params.url,
    datePublished: params.datePublished,
    dateModified: params.dateModified ?? params.datePublished,
    author: params.author
      ? {
        '@type': 'Person',
        name: params.author.name,
        url: params.author.url,
        image: params.author.avatar,
      }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: params.siteName,
      url: params.siteUrl,
      logo: params.siteLogo
        ? {
          '@type': 'ImageObject',
          url: params.siteLogo,
        }
        : undefined,
    },
    image: params.image,
    wordCount: params.wordCount,
    keywords: params.keywords?.join(', '),
    inLanguage: params.language,
  };
}

/** Build a BlogPosting schema. */
export function createBlogPostingSchema(params: TanstackJsonLdArticleParams): SchemaDtsTypes.WithContext<SchemaDtsTypes.BlogPosting> {
  return {
    ...createArticleSchema(params),
    '@type': 'BlogPosting',
  };
}

/** Build breadcrumb schema from ordered items. */
export function createBreadcrumbSchema(items: TanstackJsonLdBreadcrumbItem[]): SchemaDtsTypes.WithContext<SchemaDtsTypes.BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface TanstackJsonLdItemListItem {
  name: string
  position: number
}

/** Build an ItemList schema from ranked items. */
export function createItemListSchema(items: readonly TanstackJsonLdItemListItem[]): SchemaDtsTypes.WithContext<SchemaDtsTypes.ItemList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
    })),
  };
}

/** Build a WebPage schema. */
export function createWebPageSchema(params: TanstackJsonLdWebPageParams): SchemaDtsTypes.WithContext<SchemaDtsTypes.WebPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: params.name,
    description: params.description,
    url: params.url,
    isPartOf: {
      '@type': 'WebSite',
      name: params.siteName,
      url: params.siteUrl,
    },
    datePublished: params.datePublished,
    dateModified: params.dateModified ?? params.datePublished,
  };
}

/** Serialize multiple schemas into one JSON-LD script payload. */
export function createJsonLd(schemas: readonly TanstackJsonLdSchema[]): string {
  return JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
}

export type TanstackJsonLdReturnCategory = 'finite' | 'unlimited' | 'none' | 'seasonal'
export type TanstackJsonLdReturnFees = 'free' | 'customer' | 'origin'
export type TanstackJsonLdReturnMethod = 'mail' | 'inStore' | 'kiosk'

export interface TanstackJsonLdQuantitativeDays {
  minDays?: number
  maxDays?: number
}

export interface TanstackJsonLdOfferShipping {
  rate?: { value: number; currency?: string }
  countries: string[]
  handlingTime?: TanstackJsonLdQuantitativeDays
  transitTime?: TanstackJsonLdQuantitativeDays
}

export interface TanstackJsonLdOfferReturn {
  countries: string[]
  category?: TanstackJsonLdReturnCategory
  returnDays?: number
  returnMethod?: TanstackJsonLdReturnMethod
  returnFees?: TanstackJsonLdReturnFees
}

export interface TanstackJsonLdPricingTier {
  name: string
  price: number
  currency?: string
  billingPeriod?: string
  description?: string
  priceValidUntil?: string
  sku?: string
  url?: string
}

export interface TanstackJsonLdProductParams {
  name: string
  description: string
  image?: string | string[]
  brandName?: string
  url?: string
  sku?: string
  category?: string
  pricing: TanstackJsonLdPricingTier[]
  aggregateRating?: TanstackJsonLdAggregateRatingParams
  reviews?: TanstackJsonLdProductReview[]
  shipping?: TanstackJsonLdOfferShipping
  returnPolicy?: TanstackJsonLdOfferReturn
}

const RETURN_CATEGORY_URLS = {
  finite: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  unlimited: 'https://schema.org/MerchantReturnUnlimitedWindow',
  none: 'https://schema.org/MerchantReturnNotPermitted',
  seasonal: 'https://schema.org/MerchantReturnUnspecified',
} as const satisfies Record<TanstackJsonLdReturnCategory, string>;

const RETURN_METHOD_URLS = {
  mail: 'https://schema.org/ReturnByMail',
  inStore: 'https://schema.org/ReturnInStore',
  kiosk: 'https://schema.org/ReturnAtKiosk',
} as const satisfies Record<TanstackJsonLdReturnMethod, string>;

const RETURN_FEES_URLS = {
  free: 'https://schema.org/FreeReturn',
  customer: 'https://schema.org/ReturnFeesCustomerResponsibility',
  origin: 'https://schema.org/OriginalShippingFees',
} as const satisfies Record<TanstackJsonLdReturnFees, string>;

const BILLING_PERIOD_UNIT_CODES = {
  day: 'DAY',
  week: 'WEE',
  month: 'MON',
  quarter: 'QAN',
  year: 'ANN',
} as const;

function toShippingDetailsSchemas(shipping: TanstackJsonLdOfferShipping): SchemaDtsTypes.OfferShippingDetails[] {
  const currency = shipping.rate?.currency ?? 'USD';
  const value = shipping.rate?.value ?? 0;
  const handling = shipping.handlingTime;
  const transit = shipping.transitTime;

  return shipping.countries.map((country) => ({
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: value.toString(),
      currency,
    },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: country,
    },
    deliveryTime: handling || transit
      ? {
        '@type': 'ShippingDeliveryTime',
        handlingTime: handling
          ? {
            '@type': 'QuantitativeValue',
            minValue: handling.minDays ?? 0,
            maxValue: handling.maxDays ?? handling.minDays ?? 0,
            unitCode: 'DAY',
          }
          : undefined,
        transitTime: transit
          ? {
            '@type': 'QuantitativeValue',
            minValue: transit.minDays ?? 0,
            maxValue: transit.maxDays ?? transit.minDays ?? 0,
            unitCode: 'DAY',
          }
          : undefined,
      }
      : undefined,
  }));
}

function toMerchantReturnPolicySchema(returnPolicy: TanstackJsonLdOfferReturn): SchemaDtsTypes.MerchantReturnPolicy {
  const category = returnPolicy.category ?? 'finite';
  const isFinite = category === 'finite';

  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: returnPolicy.countries,
    returnPolicyCategory: RETURN_CATEGORY_URLS[category],
    merchantReturnDays: isFinite ? returnPolicy.returnDays ?? 30 : undefined,
    returnMethod: returnPolicy.returnMethod ? RETURN_METHOD_URLS[returnPolicy.returnMethod] : undefined,
    returnFees: returnPolicy.returnFees ? RETURN_FEES_URLS[returnPolicy.returnFees] : undefined,
  };
}

/** Build a Product schema. */
export function createProductSchema(params: TanstackJsonLdProductParams): SchemaDtsTypes.WithContext<SchemaDtsTypes.Product> {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const defaultPriceValidUntil = oneYearFromNow.toISOString().split('T')[0];

  const shippingDetails = params.shipping ? toShippingDetailsSchemas(params.shipping) : undefined;
  const hasMerchantReturnPolicy = params.returnPolicy ? toMerchantReturnPolicySchema(params.returnPolicy) : undefined;

  const offers: SchemaDtsTypes.Offer[] = params.pricing.map((tier) => {
    const period = tier.billingPeriod?.toLowerCase();
    let unitCode: (typeof BILLING_PERIOD_UNIT_CODES)[keyof typeof BILLING_PERIOD_UNIT_CODES] = 'MON';

    if (period && period in BILLING_PERIOD_UNIT_CODES) {
      // SAFETY: `in` means period is an own key of BILLING_PERIOD_UNIT_CODES.
      unitCode = BILLING_PERIOD_UNIT_CODES[period as keyof typeof BILLING_PERIOD_UNIT_CODES];
    }

    return {
      '@type': 'Offer' as const,
      name: tier.name,
      sku: tier.sku,
      url: tier.url,
      price: tier.price.toString(),
      priceCurrency: tier.currency ?? 'USD',
      description: tier.description,
      priceValidUntil: tier.priceValidUntil ?? defaultPriceValidUntil,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      shippingDetails,
      hasMerchantReturnPolicy,
      priceSpecification: tier.billingPeriod
        ? {
          '@type': 'UnitPriceSpecification' as const,
          price: tier.price.toString(),
          priceCurrency: tier.currency ?? 'USD',
          referenceQuantity: {
            '@type': 'QuantitativeValue' as const,
            value: 1,
            unitCode,
          },
        }
        : undefined,
    };
  });

  const reviewSchemas = params.reviews?.map(toReviewSchema);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: params.name,
    description: params.description,
    image: params.image,
    url: params.url,
    sku: params.sku,
    category: params.category,
    brand: params.brandName
      ? {
        '@type': 'Brand',
        name: params.brandName,
      }
      : undefined,
    offers,
    aggregateRating: params.aggregateRating
      ? {
        '@type': 'AggregateRating',
        ratingValue: params.aggregateRating.ratingValue,
        reviewCount: params.aggregateRating.reviewCount,
        bestRating: params.aggregateRating.bestRating ?? 5,
        worstRating: params.aggregateRating.worstRating ?? 1,
      }
      : undefined,
    review: reviewSchemas,
  };
}
