import { z } from "zod";

/** The Guardian Open Platform `/search` wire format, as far as we consume it. */

export const GuardianResultSchema = z.object({
  id: z.string().nullish(),
  type: z.string().nullish(),
  sectionId: z.string().nullish(),
  sectionName: z.string().nullish(),
  webPublicationDate: z.string().nullish(),
  webTitle: z.string().nullish(),
  webUrl: z.string().nullish(),
  fields: z
    .object({
      headline: z.string().nullish(),
      trailText: z.string().nullish(),
      body: z.string().nullish(),
      bodyText: z.string().nullish(),
      wordcount: z.string().nullish(),
      standfirst: z.string().nullish(),
      lastModified: z.string().nullish(),
      firstPublicationDate: z.string().nullish(),
      isLive: z.union([z.boolean(), z.string()]).nullish(),
      liveBloggingNow: z.union([z.boolean(), z.string()]).nullish(),
      shortUrl: z.string().nullish(),
      byline: z.string().nullish(),
      thumbnail: z.string().nullish(),
    })
    .nullish(),
  pillarName: z.string().nullish(),
  elements: z
    .array(
      z.object({
        type: z.string().nullish(),
        relation: z.string().nullish(),
        assets: z
          .array(
            z.object({
              file: z.string().nullish(),
              typeData: z
                .object({
                  altText: z.string().nullish(),
                  caption: z.string().nullish(),
                  credit: z.string().nullish(),
                  photographer: z.string().nullish(),
                  width: z.union([z.number(), z.string()]).nullish(),
                  height: z.union([z.number(), z.string()]).nullish(),
                  secureFile: z.string().nullish(),
                })
                .nullish(),
            }),
          )
          .nullish(),
      }),
    )
    .nullish(),
  tags: z
    .array(
      z.object({
        id: z.string().nullish(),
        type: z.string().nullish(),
        webTitle: z.string().nullish(),
        bylineImageUrl: z.string().nullish(),
      }),
    )
    .nullish(),
});

export const GuardianItemResponseSchema = z.object({
  response: z.object({
    status: z.string(),
    content: GuardianResultSchema.nullish(),
    message: z.string().nullish(),
  }),
});

export const GuardianResponseSchema = z.object({
  response: z.object({
    status: z.string(),
    total: z.number().nullish(),
    results: z.array(GuardianResultSchema).nullish(),
    message: z.string().nullish(),
  }),
});

export type GuardianResult = z.infer<typeof GuardianResultSchema>;
export type GuardianResponse = z.infer<typeof GuardianResponseSchema>;
