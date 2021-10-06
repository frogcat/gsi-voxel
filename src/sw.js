const SphericalMercator = require("@mapbox/sphericalmercator");
const geojsonvt = require("geojson-vt").default;
const vtpbf = require("vt-pbf");

self.addEventListener('fetch', (event) => {
  if (!event.request.url.match(/^(.*)\/([0-9]+)\/([0-9]+)\/([0-9]+)\.([a-z]+)\?voxel=([0-9]+)$/)) return;

  const src = {
    prefix: RegExp.$1,
    z: parseInt(RegExp.$2),
    x: parseInt(RegExp.$3),
    y: parseInt(RegExp.$4),
    suffix: RegExp.$5,
    v: parseInt(RegExp.$6),
    top: 0,
    left: 0,
    bottom: 0x100,
    right: 0x100
  };

  const dst = Object.assign({}, src);
  while (dst.v > 0) {
    dst.left = dst.left / 2 + (dst.x % 2 === 0 ? 0 : 0x80);
    dst.right = dst.right / 2 + (dst.x % 2 === 0 ? 0 : 0x80);
    dst.top = dst.top / 2 + (dst.y % 2 === 0 ? 0 : 0x80);
    dst.bottom = dst.bottom / 2 + (dst.y % 2 === 0 ? 0 : 0x80);
    dst.v--;
    dst.z--;
    dst.x = Math.floor(dst.x / 2);
    dst.y = Math.floor(dst.y / 2);
  }

  event.respondWith(async function() {

    const dem = await fetch(`https://cyberjapandata.gsi.go.jp/xyz/${dst.z>8 ?"dem" : "demgm"}/${dst.z}/${dst.x}/${dst.y}.txt`).then(a => a.ok ? a.text() : null);
    if (dem === null) return new Response(null, {
      status: 404,
      statusText: "DEM not found"
    });

    const img = await fetch(`${dst.prefix}/${dst.z}/${dst.x}/${dst.y}.${dst.suffix}`).then(a => a.ok ? a.blob() : null);
    if (img === null) return new Response(null, {
      status: 404,
      statusText: "IMG not found"
    });

    const imageBitmap = await self.createImageBitmap(img);
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const context = canvas.getContext("2d");
    context.drawImage(imageBitmap, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const alt = dem.split("\n").map(a => a.split(",").map(b => parseFloat(b)));

    const merc = new SphericalMercator({
      size: 256
    });

    const features = [];

    for (let y = dst.top; y <= dst.bottom; y++) {
      for (let x = dst.left; x <= dst.right; x++) {
        const height = alt[y][x];
        if (isNaN(height)) continue;
        const rgb = [
          imageData.data[4 * (y * 0x100 + x) + 0],
          imageData.data[4 * (y * 0x100 + x) + 1],
          imageData.data[4 * (y * 0x100 + x) + 2]
        ];
        const bbox = merc.bbox(dst.x * 0x100 + x, dst.y * 0x100 + y, dst.z + 8);
        features.push({
          type: "Feature",
          properties: {
            height: height,
            color: `rgb(${rgb.join(",")})`
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [bbox[0], bbox[1]],
                [bbox[2], bbox[1]],
                [bbox[2], bbox[3]],
                [bbox[0], bbox[3]],
                [bbox[0], bbox[1]]
              ]
            ]
          }
        });
      }
    }

    if (features.length === 0) return new Response(null, {
      status: 404,
      statusText: "Features not found"
    });

    const geojson = {
      "type": "FeatureCollection",
      "features": features
    };
    const tileindex = geojsonvt(geojson);
    const tile = tileindex.getTile(src.z, src.x, src.y);
    if (tile.features.length === 0) return;
    const buffer = vtpbf.fromGeojsonVt({
      'voxel': tile
    });
    return new Response(buffer, {
      type: "application/octet-stream"
    });
  }());
});
