/** Unsplash image map ported from the mockup's app.js (IMG + IMG_CROP).
 *  Mockup placeholders only — production uses real user uploads (docs/08 §5). */
const IMG: Record<string, string> = {
  "green-fabric-sofa": "1555041469-a586c61ea9bc",
  "yellow-chair": "1586023492125-27b2c045efd7",
  "grey-sofa": "1493663284031-b7e3aefcae8e",
  "arc-lamp": "1524758631624-e2822e304c36",
  "coffee-table": "1616486338812-3dadae4b4ace",
  "bed-pillows": "1616627561950-9f746e330187",
  "rattan-table": "1583847268964-b28dc8f51f92",
  "shell-chair": "1592078615290-033ee584e267",
  "tufted-chair": "1567538096630-e0c55bd6374c",
  "plastic-chair": "1517705008128-361805f42e86",
  shelves: "1594026112284-02bb6f3352fe",
  "bathroom-mirror": "1584622650111-993a426fbf0a",
  "wall-clock": "1533090161767-e6ffed986c88",
  "pendant-lamps": "1540932239986-30128078f3c5",
  "mug-set": "1544787219-7f47ccb76574",
  "dining-set": "1519710164239-da123dc03ef4",
  whiteboard: "1616628188859-7a11abb6fcc9",
  "headphones-blue": "1550009158-9ebf69173e03",
  "pink-sofa": "1556228453-efd6c1ff04f6",
  "camera-tripod": "1558618666-fcd25c85cd64",
  cookware: "1556909212-d5b604d0c90d",
  "living-bright": "1560448204-e02f11c3d0e2",
  "blue-chair": "1493809842364-78817add7ffb",
  sectional: "1584622781564-1d987f7333c1",
  "leather-sofa": "1540574163026-643ea20ade25",
  "bed-nightstand": "1522771739844-6a9f6d5f14af",
  "plant-corner": "1522444195799-478538b28823",
  "member-portrait": "1580489944761-15a19d654956",
  "road-bike": "1485965120184-e220f721d03e",
  "book-bundle": "1512820790803-83ca734da794",
  "color-books": "1497633762265-9d179a990aa6",
  "garden-trowel": "1416879595882-3373a0480b5b",
  succulent: "1485955900006-10f4d324d411",
  "laptop-silver": "1496181133206-80ce9b88a853",
  "water-bottle": "1602143407151-7111542de6e8",
  "instant-camera": "1526170375885-4d8ecf77b99f",
  "headphones-yellow": "1505740420928-5e560c06d30e",
  sunglasses: "1572635196237-14b3f281503f",
  "shirts-hanging": "1523381210434-271e8be1f52b",
  "white-tee": "1521572163474-6864f9cf17ab",
};

/** Item-only crops: some source photos include a passer-by; crop it out. */
const IMG_CROP: Record<string, string> = { "road-bike": "&rect=1900,0,2540,2960" };

export function imgUrl(key: string, w = 900): string {
  return `https://images.unsplash.com/photo-${IMG[key] ?? IMG["green-fabric-sofa"]}?auto=format&fit=crop&w=${w}&q=72${IMG_CROP[key] ?? ""}`;
}
