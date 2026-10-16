# Menu photos and clips

These files are hosted with the site; no Cloudinary account is required.

For the first special, paste this into the Google Sheet's `image` cell:

https://swipemenu.vercel.app/media/don-pedro.webp

`media/don-pedro.webp` also works as a relative path. The image is 800 × 1000 pixels,
encoded as WebP with embedded metadata removed. Its composition is unchanged.

Future uploads can be attached in chat for optimization and committing, or uploaded
here through GitHub. The build automatically copies top-level `.webp`, `.avif`,
`.jpg`, `.jpeg`, `.png`, `.mp4`, and `.webm` files. Documentation and other files
are excluded. Keep original full-size source files outside this folder.

After the GitHub commit deploys, update the appropriate Sheet cell and refresh the
menu. Sheet edits need no further deployment. To replace a photo, prefer a new
filename so browsers do not retain an older image under the same link.
