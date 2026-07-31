# Third-Party Notices

KO-PICK includes or depends on open-source software. Copyright remains with
each project and its contributors. The source dependency manifests and lock
files are the authoritative version list for each release.

## Frontend production dependencies

| Package | License |
| --- | --- |
| Next.js | MIT |
| React | MIT |
| React DOM | MIT |
| Supabase JavaScript Client | MIT |
| Supabase SSR | MIT |

Transitive npm dependencies and exact versions are recorded in
`package-lock.json`. Their license files are distributed in their respective
packages.

## Backend production dependencies

| Project | License |
| --- | --- |
| Spring Boot and Spring Framework | Apache License 2.0 |
| Spring Security | Apache License 2.0 |
| Spring Session | Apache License 2.0 |
| Hibernate ORM | LGPL 2.1 |
| Flyway | Apache License 2.0 |
| PostgreSQL JDBC Driver | BSD 2-Clause |
| JJWT | Apache License 2.0 |
| Jackson | Apache License 2.0 |

Exact Maven artifacts and versions are resolved from `backend/pom.xml`.
Source code for LGPL-covered components remains available from their upstream
projects, and KO-PICK does not modify those libraries.

## Public data and media

Place data and verified representative images are supplied by the Korea
Tourism Organization TourAPI. Representative images are displayed only when
the per-image copyright classification returned by TourAPI is `Type1` or
`Type3`. KO-PICK displays the source and Korea Open Government License type
with each image. Type3 images are rendered without cropping, filters, or zoom
effects.

- TourAPI dataset: https://www.data.go.kr/data/15101578/openapi.do
- Korea Open Government License terms: https://www.kogl.or.kr/info/license.do

## Common license text

MIT-licensed components are provided under the following terms:

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

Apache-2.0, BSD-2-Clause, and LGPL-2.1 license texts and notices are available
from the linked upstream distributions bundled by the dependency managers.
