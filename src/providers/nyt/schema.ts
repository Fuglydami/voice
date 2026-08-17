import { z } from "zod";

/**
 * New York Times Article Search wire format.
 *
 * The NYT payload is the most awkward of the three: headlines are nested, the
 * byline is a structured `person[]` array, and image URLs are site-relative
 * paths that must be joined onto `static01.nyt.com`.
 */

export const NytDocSchema = z.object({
  _id: z.string().nullish(),
  web_url: z.string().nullish(),
  abstract: z.string().nullish(),
  snippet: z.string().nullish(),
  lead_paragraph: z.string().nullish(),
  source: z.string().nullish(),
  pub_date: z.string().nullish(),
  section_name: z.string().nullish(),
  word_count: z.number().nullish(),
  type_of_material: z.string().nullish(),
  uri: z.string().nullish(),
  keywords: z.array(z.object({ name: z.string().nullish(), value: z.string().nullish() })).nullish(),
  subsection_name: z.string().nullish(),
  news_desk: z.string().nullish(),
  headline: z
    .object({
      main: z.string().nullish(),
      kicker: z.string().nullish(),
      print_headline: z.string().nullish(),
    })
    .nullish(),
  byline: z
    .object({
      original: z.string().nullish(),
      person: z
        .array(
          z.object({
            firstname: z.string().nullish(),
            middlename: z.string().nullish(),
            lastname: z.string().nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
  multimedia: z
    .union([
      // Current shape: an object with named renditions.
      z.object({
        default: z
          .object({
            url: z.string().nullish(),
            width: z.number().nullish(),
            height: z.number().nullish(),
          })
          .nullish(),
        thumbnail: z
          .object({
            url: z.string().nullish(),
            width: z.number().nullish(),
            height: z.number().nullish(),
          })
          .nullish(),
        caption: z.string().nullish(),
        credit: z.string().nullish(),
      }),
      // Legacy shape: a flat array of renditions.
      z.array(z.object({ url: z.string().nullish(), subtype: z.string().nullish() })),
    ])
    .nullish(),
});

export const NytResponseSchema = z.object({
  status: z.string().nullish(),
  fault: z.object({ faultstring: z.string().nullish() }).nullish(),
  response: z
    .object({
      docs: z.array(NytDocSchema).nullish(),
      meta: z.object({ hits: z.number().nullish() }).nullish(),
    })
    .nullish(),
});

export type NytDoc = z.infer<typeof NytDocSchema>;
export type NytResponse = z.infer<typeof NytResponseSchema>;
