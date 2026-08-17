import { z } from "zod";

/**
 * The NewsAPI.org wire format, described only as far as we consume it.
 *
 * Everything optional is `.nullish()` rather than required: an aggregator that
 * throws away a whole page because one article lacks an image is worse than one
 * that renders the article without it.
 */

export const NewsApiArticleSchema = z.object({
  source: z.object({ id: z.string().nullish(), name: z.string().nullish() }).nullish(),
  author: z.string().nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  url: z.string().nullish(),
  urlToImage: z.string().nullish(),
  publishedAt: z.string().nullish(),
  content: z.string().nullish(),
});

export const NewsApiResponseSchema = z.object({
  status: z.string(),
  totalResults: z.number().nullish(),
  articles: z.array(NewsApiArticleSchema).nullish(),
  code: z.string().nullish(),
  message: z.string().nullish(),
});

export type NewsApiArticle = z.infer<typeof NewsApiArticleSchema>;
export type NewsApiResponse = z.infer<typeof NewsApiResponseSchema>;
