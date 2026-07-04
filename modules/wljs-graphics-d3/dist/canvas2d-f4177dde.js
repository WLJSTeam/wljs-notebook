// build a dense array of handlers where index = op-code

const _handlers = [
  /*0*/ (refs, ctx) => {},
  /*1*/ (refs, ctx, x, y, w, h)            => ctx.fillRect(  x,  y,  w,  h),
  /*2*/ (refs, ctx, x, y, w, h)            => ctx.strokeRect(x,  y,  w,  h),
  /*3*/ (refs, ctx)                        => ctx.beginPath(),
  /*4*/ (refs, ctx)                        => ctx.closePath(),
  /*5*/ (refs, ctx, x, y)                  => ctx.moveTo(    x,  y),
  /*6*/ (refs, ctx, x, y)                  => ctx.lineTo(    x,  y),
  /*7*/ (refs, ctx)                        => ctx.fill(),
  /*8*/ (refs, ctx, x, y, w, h)            => ctx.rect(     x,  y,  w,  h),
  /*9*/ (refs, ctx)                        => ctx.stroke(),
  /*10*/(refs, ctx, x, y, r, a1, a2, ccw)  => ctx.arc(      x,  y,  r,  a1, a2, !ccw),
  /*11*/(refs, ctx, cpx, cpy, x, y)        => ctx.quadraticCurveTo(cpx, cpy, x, y),
  /*12*/(refs, ctx, cp1x, cp1y, cp2x, cp2y, x, y) => ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y),
  /*13*/(refs, ctx, text, x, y)            => ctx.fillText(text, x, y),
  /*14*/(refs, ctx, text, x, y)            => ctx.strokeText(text, x, y),

  /*15*/ null, // reserved if you ever re-add MeasureText
  /*16*/(refs, ctx, style)                 => { ctx.fillStyle   = style; },
  /*17*/(refs, ctx, style)                 => { ctx.strokeStyle = style; },
  /*18*/(refs, ctx, w)                     => { ctx.lineWidth   = w; },
  /*19*/(refs, ctx, cap)                   => { ctx.lineCap     = cap; },
  /*20*/(refs, ctx, join)                  => { ctx.lineJoin    = join; },
  /*21*/(refs, ctx, m)                     => { ctx.miterLimit  = m; },
  /*22*/(refs, ctx, fontSpec)              => { ctx.font        = fontSpec; },
  /*23*/(refs, ctx)                        => { ctx.save(); },
  /*24*/(refs, ctx)                        => { ctx.restore(); },
  /*25*/(refs, ctx, dx, dy)                => { ctx.translate(dx, dy); },
  /*26*/(refs, ctx, angle)                 => { ctx.rotate(angle); },
  /*27*/(refs, ctx, sx, sy)                => { ctx.scale(sx, sy); },
  /*28*/(refs, ctx)                        => { ctx.clip(); },
  /*29*/(refs, ctx, a)                     => { ctx.globalAlpha = a; },
  /*30*/(refs, ctx, align)                 => { ctx.textAlign   = align; },
  /*31*/(refs, ctx, baseline)              => { ctx.textBaseline= baseline; },
  /*32*/ (refs, ctx, ...dashArray)              => { ctx.setLineDash(dashArray); },
  /*33*/ (refs, ctx, offset)                    => { ctx.lineDashOffset = offset; },

  /*34*/ (refs, ctx, x, y, w, h)                => { ctx.clearRect(x, y, w, h); },

  /*35*/ (refs, ctx, x1, y1, x2, y2, r)         => { ctx.arcTo(x1, y1, x2, y2, r); },
  /*36*/ (refs, ctx, x, y, w, h, r)             => { ctx.roundRect(x, y, w, h, r); },

  /*37*/ (refs, ctx, a, b, c, d, e, f)          => { ctx.transform(a, b, c, d, e, f); },
  /*38*/ (refs, ctx, a, b, c, d, e, f)          => { ctx.setTransform(a, b, c, d, e, f); },
  /*39*/ (refs, ctx)                            => { ctx.resetTransform(); },

  /*40*/ (refs, ctx, op)                        => { ctx.globalCompositeOperation = op; },
  /*41*/ (refs, ctx, filt)                      => { ctx.filter = filt; },

  /*42*/ (refs, ctx, enabled)                   => { ctx.imageSmoothingEnabled = !!enabled; },
  /*43*/ (refs, ctx, quality)                   => { ctx.imageSmoothingQuality = quality; },

  /*44*/ (refs, ctx, x)                         => { ctx.shadowOffsetX = x; },
  /*45*/ (refs, ctx, y)                         => { ctx.shadowOffsetY = y; },
  /*46*/ (refs, ctx, blur)                      => { ctx.shadowBlur    = blur; },
  /*47*/ (refs, ctx, color)                     => { ctx.shadowColor   = color; },

  /*48*/ (refs, ctx, x0, y0, x1, y1, any1, any2, index)            => { refs.set(index, ctx.createLinearGradient(x0, y0, x1, y1)); },
  /*49*/ (refs, ctx, x0, y0, r0, x1, y1,    r1,  index)    => { refs.set(index, ctx.createRadialGradient(x0, y0, r0, x1, y1, r1)); },
  /*50*/ (refs, ctx, angle, x, y, any1, any2, any3, index)               => { refs.set(index, ctx.createConicGradient(angle, x, y) ); } ,
  /*51*/ (refs, ctx, grad, offset, color) => { refs.get(grad).addColorStop(offset, color); },

  /*52*/(refs, ctx, grad)                 => { ctx.fillStyle   = refs.get(grad); },
  /*53*/(refs, ctx, grad)                 => { ctx.strokeStyle = refs.get(grad); },

  /*54*/(refs, ctx, img, x, y, w, h)                 => {
    if (!loadedImages.has(img)) {
      return loadImage(img);
    }

    ctx.drawImage(loadedImages.get(img).img, x, y, w, h);
  }

];

var loadedImages = new Map();

async function loadImage(id) {
    const env = {
      global: {
        stack: {}
      },
      offscreen: true
    };

    console.warn('Requested image');
    const image = await interpretate(['FrontEndExecutable', "'"+id+"'"], env);
    const img = await createImageBitmap(image);
    image.remove();
    env.img = img;
    
    loadedImages.set(id, env);
}

async function runOptcodes(ctx, codes, refs) {
  // flatten NumericArrayObject or Array-of-Arrays
  console.warn(codes);
  let data = (codes instanceof NumericArrayObject ? codes.buffer : codes).flat();
  let index=0;
  
  for (let i = 0, n = data.length; i < n; i += 7) {
    const op = data[i];
    // load all 6 args (most will be zero)
    const a1 = data[i+1],
          a2 = data[i+2],
          a3 = data[i+3],
          a4 = data[i+4],
          a5 = data[i+5],
          a6 = data[i+6];

    // direct function-pointer call
    if (op == 0) break;
    const fn = _handlers[op];
    const r = fn(refs, ctx, a1, a2, a3, a4, a5, a6, index);
    if (r) {
      await r; //repeat
      fn(refs, ctx, a1, a2, a3, a4, a5, a6, index);
    }

    index++;
    
  }
}

export { runOptcodes };
