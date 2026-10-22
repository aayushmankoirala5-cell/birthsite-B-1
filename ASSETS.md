# Asset sources

All application assets are served locally. No third-party font or stock-image request is needed to view the demo.

## Typography

The following fonts are from the [Google Fonts repository](https://github.com/google/fonts), downloaded with TLS verification on October 22, 2026. Each uses the SIL Open Font License 1.1, permitting commercial embedding and redistribution under its terms. The original notices and licenses are included beside the fonts in `public/fonts/`.

| Local file                        | Original source                                            | Designer / copyright holder                       |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| `cormorant-garamond.woff2`        | `ofl/cormorantgaramond/CormorantGaramond[wght].ttf`        | The Cormorant Project Authors; Christian Thalmann |
| `cormorant-garamond-italic.woff2` | `ofl/cormorantgaramond/CormorantGaramond-Italic[wght].ttf` | The Cormorant Project Authors; Christian Thalmann |
| `dm-sans.woff2`                   | `ofl/dmsans/DMSans[opsz,wght].ttf`                         | The DM Sans Project Authors                       |
| `allura.woff2`                    | `ofl/allura/Allura-Regular.ttf`                            | The Allura Project Authors                        |

The downloaded TTF files were subset to Latin characters, punctuation, and common symbols, and converted to WOFF2 with FontTools and Brotli. Their variable weight axes are retained. Combined font payload is approximately 151 KB. For customer names or messages in other writing systems, add an appropriately licensed font covering those characters.

## Sample memories

These are placeholder travel and nature photographs, not photographs of an actual customer. Replace them through the customer editor with photos the customer has permission to use.

Images are obtained from the [al-folio repository](https://github.com/alshedivat/al-folio). Its [site configuration, line 16](https://github.com/alshedivat/al-folio/blob/master/_config.yml#L16) explicitly attributes its demonstration photographs to [Unsplash](https://unsplash.com). The [Unsplash License](https://unsplash.com/license) grants free downloading, copying, modification, distribution, and commercial use of photographs, without required attribution. It does not permit selling photographs without significant modification or building a competing photo service. These photographs are incidental demo illustrations within a birthday application; they are not being sold as standalone photos.

The upstream repository does not preserve individual photographer names or Unsplash photo-page URLs for these numbered sample files. The repository's MIT code license is **not** being used as the source of the photographs' rights. Its notice is separately retained in `public/images/MEMORY-SOURCES-LICENSE.txt` for upstream provenance.

| Local file     | Source                                                                           | Subject                                     |
| -------------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| `memory-1.jpg` | `https://raw.githubusercontent.com/alshedivat/al-folio/master/assets/img/1.jpg`  | A mountain road and stone tunnel            |
| `memory-2.jpg` | `https://raw.githubusercontent.com/alshedivat/al-folio/master/assets/img/3.jpg`  | Hands holding evergreen needles             |
| `memory-3.jpg` | `https://raw.githubusercontent.com/alshedivat/al-folio/master/assets/img/6.jpg`  | Hot-air balloons over Cappadocia at sunrise |
| `memory-4.jpg` | `https://raw.githubusercontent.com/alshedivat/al-folio/master/assets/img/11.jpg` | A San Francisco street and skyline          |

The original photographs are included unchanged, approximately 255 KB combined. Do not imply the depicted locations or people are the customer's own memories unless the customer chooses them.

## Customer assets

Customers supply their own photos and messages through the admin editor. Obtain permission to publish customer photos, names, and messages before sharing their celebration link. Photo URLs must be HTTPS or supported local image paths. Keep the source and permission records for each customer outside the public repository.

## Birthday editorial image

`public/images/birthday-editorial.png` is an original AI-generated birthday still life created for this application: a blush cake, candles, flowers, and champagne balloons. It contains no customer likeness. The home page serves optimized responsive versions through Next.js Image.
