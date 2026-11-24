# Server-only Lighthouse runtime

[Larry] SCRUM-215. Browser-compatible official Lighthouse13.6.0 bundle from ChromeDevTools/devtools-frontend commit 85811b6fb65c133b1ba35f6ca75ce0a3338ef267, front_end/third_party/lighthouse/lighthouse-dt-bundle.js (Apache2.0, bundled license notices preserved). SHA256 cf287183b1874d83066a93f06d3b1f84cba21674be5130bf5c11c1879cedcedc.

Third-party classification is supplied using the already-installed third-party-web0.30.0 nostats-subset, bundled with existing esbuild. Its real getEntity/getProduct API is required by the official Lighthouse bundle; no substitute scoring implementation. MIT license follows. This runtime is passed only to Cloudflare Browser Run, never served to portfolio browsers. No runtime CDN fetch or new npm dependency.

The MIT License (MIT)
Copyright (c) 2019 Patrick Hulce

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
