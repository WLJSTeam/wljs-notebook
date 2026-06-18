/*!
* reveal.js 4.6.0
* https://revealjs.com
* MIT licensed
*
* Copyright (C) 2011-2023 Hakim El Hattab, https://hakim.se
*/
const e$1=(e,t)=>{for(let i in t)e[i]=t[i];return e},t$1=(e,t)=>Array.from(e.querySelectorAll(t)),i$1=(e,t,i)=>{i?e.classList.add(t):e.classList.remove(t);},s$1=e=>{if("string"==typeof e){if("null"===e)return null;if("true"===e)return !0;if("false"===e)return !1;if(e.match(/^-?[\d\.]+$/))return parseFloat(e)}return e},n$1=(e,t)=>{e.style.transform=t;},a$1=(e,t)=>{let i=e.matches||e.matchesSelector||e.msMatchesSelector;return !(!i||!i.call(e,t))},o$1=(e,t)=>{if("function"==typeof e.closest)return e.closest(t);for(;e;){if(a$1(e,t))return e;e=e.parentNode;}return null},r$1=(e,t,i,s="")=>{let n=e.querySelectorAll("."+i);for(let t=0;t<n.length;t++){let i=n[t];if(i.parentNode===e)return i}let a=document.createElement(t);return a.className=i,a.innerHTML=s,e.appendChild(a),a},l$1=e=>{let t=document.createElement("style");return t.type="text/css",e&&e.length>0&&(t.styleSheet?t.styleSheet.cssText=e:t.appendChild(document.createTextNode(e))),document.head.appendChild(t),t},d$1=()=>{let e={};location.search.replace(/[A-Z0-9]+?=([\w\.%-]*)/gi,(t=>{e[t.split("=").shift()]=t.split("=").pop();}));for(let t in e){let i=e[t];e[t]=s$1(unescape(i));}return void 0!==e.dependencies&&delete e.dependencies,e},c$1=(e,t=0)=>{if(e){let i,s=e.style.height;return e.style.height="0px",e.parentNode.style.height="auto",i=t-e.parentNode.offsetHeight,e.style.height=s+"px",e.parentNode.style.removeProperty("height"),i}return t},h$1={mp4:"video/mp4",m4a:"video/mp4",ogv:"video/ogg",mpeg:"video/mpeg",webm:"video/webm"},u$1=navigator.userAgent,g$1=/(iphone|ipod|ipad|android)/gi.test(u$1)||"MacIntel"===navigator.platform&&navigator.maxTouchPoints>1;const v$1=/android/gi.test(u$1);var p$1={};Object.defineProperty(p$1,"__esModule",{value:!0});var m$1=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var i=arguments[t];for(var s in i)Object.prototype.hasOwnProperty.call(i,s)&&(e[s]=i[s]);}return e},f$1=p$1.default=function(e){if(e){var t=function(e){return [].slice.call(e)},i=0,s=1,n=2,a=3,o=[],r=null,l="requestAnimationFrame"in e?function(){e.cancelAnimationFrame(r),r=e.requestAnimationFrame((function(){return c(o.filter((function(e){return e.dirty&&e.active})))}));}:function(){},d=function(e){return function(){o.forEach((function(t){return t.dirty=e})),l();}},c=function(e){e.filter((function(e){return !e.styleComputed})).forEach((function(e){e.styleComputed=v(e);})),e.filter(p).forEach(f);var t=e.filter(g);t.forEach(u),t.forEach((function(e){f(e),h(e);})),t.forEach(b);},h=function(e){return e.dirty=i},u=function(e){e.availableWidth=e.element.parentNode.clientWidth,e.currentWidth=e.element.scrollWidth,e.previousFontSize=e.currentFontSize,e.currentFontSize=Math.min(Math.max(e.minSize,e.availableWidth/e.currentWidth*e.previousFontSize),e.maxSize),e.whiteSpace=e.multiLine&&e.currentFontSize===e.minSize?"normal":"nowrap";},g=function(e){return e.dirty!==n||e.dirty===n&&e.element.parentNode.clientWidth!==e.availableWidth},v=function(t){var i=e.getComputedStyle(t.element,null);t.currentFontSize=parseFloat(i.getPropertyValue("font-size")),t.display=i.getPropertyValue("display"),t.whiteSpace=i.getPropertyValue("white-space");},p=function(e){var t=!1;return !e.preStyleTestCompleted&&(/inline-/.test(e.display)||(t=!0,e.display="inline-block"),"nowrap"!==e.whiteSpace&&(t=!0,e.whiteSpace="nowrap"),e.preStyleTestCompleted=!0,t)},f=function(e){e.element.style.whiteSpace=e.whiteSpace,e.element.style.display=e.display,e.element.style.fontSize=e.currentFontSize+"px";},b=function(e){e.element.dispatchEvent(new CustomEvent("fit",{detail:{oldValue:e.previousFontSize,newValue:e.currentFontSize,scaleFactor:e.currentFontSize/e.previousFontSize}}));},y=function(e,t){return function(){e.dirty=t,e.active&&l();}},w=function(e){return function(){o=o.filter((function(t){return t.element!==e.element})),e.observeMutations&&e.observer.disconnect(),e.element.style.whiteSpace=e.originalStyle.whiteSpace,e.element.style.display=e.originalStyle.display,e.element.style.fontSize=e.originalStyle.fontSize;}},E=function(e){return function(){e.active||(e.active=!0,l());}},R=function(e){return function(){return e.active=!1}},S=function(e){e.observeMutations&&(e.observer=new MutationObserver(y(e,s)),e.observer.observe(e.element,e.observeMutations));},A={minSize:16,maxSize:512,multiLine:!0,observeMutations:"MutationObserver"in e&&{subtree:!0,childList:!0,characterData:!0}},k=null,L=function(){e.clearTimeout(k),k=e.setTimeout(d(n),P.observeWindowDelay);},C=["resize","orientationchange"];return Object.defineProperty(P,"observeWindow",{set:function(t){var i=(t?"add":"remove")+"EventListener";C.forEach((function(t){e[i](t,L);}));}}),P.observeWindow=!0,P.observeWindowDelay=100,P.fitAll=d(a),P}function x(e,t){var i=m$1({},A,t),s=e.map((function(e){var t=m$1({},i,{element:e,active:!0});return function(e){e.originalStyle={whiteSpace:e.element.style.whiteSpace,display:e.element.style.display,fontSize:e.element.style.fontSize},S(e),e.newbie=!0,e.dirty=!0,o.push(e);}(t),{element:e,fit:y(t,a),unfreeze:E(t),freeze:R(t),unsubscribe:w(t)}}));return l(),s}function P(e){var i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return "string"==typeof e?x(t(document.querySelectorAll(e)),i):x([e],i)[0]}}("undefined"==typeof window?null:window);let b$1 = class b{constructor(e){this.Reveal=e,this.startEmbeddedIframe=this.startEmbeddedIframe.bind(this);}shouldPreload(e){let t=this.Reveal.getConfig().preloadIframes;return "boolean"!=typeof t&&(t=e.hasAttribute("data-preload")),t}load(e,i={}){e.style.display=this.Reveal.getConfig().display,t$1(e,"img[data-src], video[data-src], audio[data-src], iframe[data-src]").forEach((e=>{("IFRAME"!==e.tagName||this.shouldPreload(e))&&(e.setAttribute("src",e.getAttribute("data-src")),e.setAttribute("data-lazy-loaded",""),e.removeAttribute("data-src"));})),t$1(e,"video, audio").forEach((e=>{let i=0;t$1(e,"source[data-src]").forEach((e=>{e.setAttribute("src",e.getAttribute("data-src")),e.removeAttribute("data-src"),e.setAttribute("data-lazy-loaded",""),i+=1;})),g$1&&"VIDEO"===e.tagName&&e.setAttribute("playsinline",""),i>0&&e.load();}));let s=e.slideBackgroundElement;if(s){s.style.display="block";let t=e.slideBackgroundContentElement,n=e.getAttribute("data-background-iframe");if(!1===s.hasAttribute("data-loaded")){s.setAttribute("data-loaded","true");let a=e.getAttribute("data-background-image"),o=e.getAttribute("data-background-video"),r=e.hasAttribute("data-background-video-loop"),l=e.hasAttribute("data-background-video-muted");if(a)/^data:/.test(a.trim())?t.style.backgroundImage=`url(${a.trim()})`:t.style.backgroundImage=a.split(",").map((e=>`url(${((e="")=>encodeURI(e).replace(/%5B/g,"[").replace(/%5D/g,"]").replace(/[!'()*]/g,(e=>`%${e.charCodeAt(0).toString(16).toUpperCase()}`)))(decodeURI(e.trim()))})`)).join(",");else if(o&&!this.Reveal.isSpeakerNotes()){let e=document.createElement("video");r&&e.setAttribute("loop",""),l&&(e.muted=!0),g$1&&(e.muted=!0,e.setAttribute("playsinline","")),o.split(",").forEach((t=>{let i=((e="")=>h$1[e.split(".").pop()])(t);e.innerHTML+=i?`<source src="${t}" type="${i}">`:`<source src="${t}">`;})),t.appendChild(e);}else if(n&&!0!==i.excludeIframes){let e=document.createElement("iframe");e.setAttribute("allowfullscreen",""),e.setAttribute("mozallowfullscreen",""),e.setAttribute("webkitallowfullscreen",""),e.setAttribute("allow","autoplay"),e.setAttribute("data-src",n),e.style.width="100%",e.style.height="100%",e.style.maxHeight="100%",e.style.maxWidth="100%",t.appendChild(e);}}let a=t.querySelector("iframe[data-src]");a&&this.shouldPreload(s)&&!/autoplay=(1|true|yes)/gi.test(n)&&a.getAttribute("src")!==n&&a.setAttribute("src",n);}this.layout(e);}layout(e){Array.from(e.querySelectorAll(".r-fit-text")).forEach((e=>{f$1(e,{minSize:24,maxSize:.8*this.Reveal.getConfig().height,observeMutations:!1,observeWindow:!1});}));}unload(e){e.style.display="none";let i=this.Reveal.getSlideBackground(e);i&&(i.style.display="none",t$1(i,"iframe[src]").forEach((e=>{e.removeAttribute("src");}))),t$1(e,"video[data-lazy-loaded][src], audio[data-lazy-loaded][src], iframe[data-lazy-loaded][src]").forEach((e=>{e.setAttribute("data-src",e.getAttribute("src")),e.removeAttribute("src");})),t$1(e,"video[data-lazy-loaded] source[src], audio source[src]").forEach((e=>{e.setAttribute("data-src",e.getAttribute("src")),e.removeAttribute("src");}));}formatEmbeddedContent(){let e=(e,i,s)=>{t$1(this.Reveal.getSlidesElement(),"iframe["+e+'*="'+i+'"]').forEach((t=>{let i=t.getAttribute(e);i&&-1===i.indexOf(s)&&t.setAttribute(e,i+(/\?/.test(i)?"&":"?")+s);}));};e("src","youtube.com/embed/","enablejsapi=1"),e("data-src","youtube.com/embed/","enablejsapi=1"),e("src","player.vimeo.com/","api=1"),e("data-src","player.vimeo.com/","api=1");}startEmbeddedContent(e){e&&!this.Reveal.isSpeakerNotes()&&(t$1(e,'img[src$=".gif"]').forEach((e=>{e.setAttribute("src",e.getAttribute("src"));})),t$1(e,"video, audio").forEach((e=>{if(o$1(e,".fragment")&&!o$1(e,".fragment.visible"))return;let t=this.Reveal.getConfig().autoPlayMedia;if("boolean"!=typeof t&&(t=e.hasAttribute("data-autoplay")||!!o$1(e,".slide-background")),t&&"function"==typeof e.play)if(e.readyState>1)this.startEmbeddedMedia({target:e});else if(g$1){let t=e.play();t&&"function"==typeof t.catch&&!1===e.controls&&t.catch((()=>{e.controls=!0,e.addEventListener("play",(()=>{e.controls=!1;}));}));}else e.removeEventListener("loadeddata",this.startEmbeddedMedia),e.addEventListener("loadeddata",this.startEmbeddedMedia);})),t$1(e,"iframe[src]").forEach((e=>{o$1(e,".fragment")&&!o$1(e,".fragment.visible")||this.startEmbeddedIframe({target:e});})),t$1(e,"iframe[data-src]").forEach((e=>{o$1(e,".fragment")&&!o$1(e,".fragment.visible")||e.getAttribute("src")!==e.getAttribute("data-src")&&(e.removeEventListener("load",this.startEmbeddedIframe),e.addEventListener("load",this.startEmbeddedIframe),e.setAttribute("src",e.getAttribute("data-src")));})));}startEmbeddedMedia(e){let t=!!o$1(e.target,"html"),i=!!o$1(e.target,".present");t&&i&&(e.target.currentTime=0,e.target.play()),e.target.removeEventListener("loadeddata",this.startEmbeddedMedia);}startEmbeddedIframe(e){let t=e.target;if(t&&t.contentWindow){let i=!!o$1(e.target,"html"),s=!!o$1(e.target,".present");if(i&&s){let e=this.Reveal.getConfig().autoPlayMedia;"boolean"!=typeof e&&(e=t.hasAttribute("data-autoplay")||!!o$1(t,".slide-background")),/youtube\.com\/embed\//.test(t.getAttribute("src"))&&e?t.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}',"*"):/player\.vimeo\.com\//.test(t.getAttribute("src"))&&e?t.contentWindow.postMessage('{"method":"play"}',"*"):t.contentWindow.postMessage("slide:start","*");}}}stopEmbeddedContent(i,s={}){s=e$1({unloadIframes:!0},s),i&&i.parentNode&&(t$1(i,"video, audio").forEach((e=>{e.hasAttribute("data-ignore")||"function"!=typeof e.pause||(e.setAttribute("data-paused-by-reveal",""),e.pause());})),t$1(i,"iframe").forEach((e=>{e.contentWindow&&e.contentWindow.postMessage("slide:stop","*"),e.removeEventListener("load",this.startEmbeddedIframe);})),t$1(i,'iframe[src*="youtube.com/embed/"]').forEach((e=>{!e.hasAttribute("data-ignore")&&e.contentWindow&&"function"==typeof e.contentWindow.postMessage&&e.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}',"*");})),t$1(i,'iframe[src*="player.vimeo.com/"]').forEach((e=>{!e.hasAttribute("data-ignore")&&e.contentWindow&&"function"==typeof e.contentWindow.postMessage&&e.contentWindow.postMessage('{"method":"pause"}',"*");})),!0===s.unloadIframes&&t$1(i,"iframe[data-src]").forEach((e=>{e.setAttribute("src","about:blank"),e.removeAttribute("src");})));}};let y$1 = class y{constructor(e){this.Reveal=e;}render(){this.element=document.createElement("div"),this.element.className="slide-number",this.Reveal.getRevealElement().appendChild(this.element);}configure(e,t){let i="none";e.slideNumber&&!this.Reveal.isPrintingPDF()&&("all"===e.showSlideNumber||"speaker"===e.showSlideNumber&&this.Reveal.isSpeakerNotes())&&(i="block"),this.element.style.display=i;}update(){this.Reveal.getConfig().slideNumber&&this.element&&(this.element.innerHTML=this.getSlideNumber());}getSlideNumber(e=this.Reveal.getCurrentSlide()){let t,i=this.Reveal.getConfig(),s="h.v";if("function"==typeof i.slideNumber)t=i.slideNumber(e);else {"string"==typeof i.slideNumber&&(s=i.slideNumber),/c/.test(s)||1!==this.Reveal.getHorizontalSlides().length||(s="c");let n=e&&"uncounted"===e.dataset.visibility?0:1;switch(t=[],s){case"c":t.push(this.Reveal.getSlidePastCount(e)+n);break;case"c/t":t.push(this.Reveal.getSlidePastCount(e)+n,"/",this.Reveal.getTotalSlides());break;default:let i=this.Reveal.getIndices(e);t.push(i.h+n);let a="h/v"===s?"/":".";this.Reveal.isVerticalSlide(e)&&t.push(a,i.v+1);}}let n="#"+this.Reveal.location.getHash(e);return this.formatNumber(t[0],t[1],t[2],n)}formatNumber(e,t,i,s="#"+this.Reveal.location.getHash()){return "number"!=typeof i||isNaN(i)?`<a href="${s}">\n\t\t\t\t\t<span class="slide-number-a">${e}</span>\n\t\t\t\t\t</a>`:`<a href="${s}">\n\t\t\t\t\t<span class="slide-number-a">${e}</span>\n\t\t\t\t\t<span class="slide-number-delimiter">${t}</span>\n\t\t\t\t\t<span class="slide-number-b">${i}</span>\n\t\t\t\t\t</a>`}destroy(){this.element.remove();}};let w$1 = class w{constructor(e){this.Reveal=e,this.onInput=this.onInput.bind(this),this.onBlur=this.onBlur.bind(this),this.onKeyDown=this.onKeyDown.bind(this);}render(){this.element=document.createElement("div"),this.element.className="jump-to-slide",this.jumpInput=document.createElement("input"),this.jumpInput.type="text",this.jumpInput.className="jump-to-slide-input",this.jumpInput.placeholder="Jump to slide",this.jumpInput.addEventListener("input",this.onInput),this.jumpInput.addEventListener("keydown",this.onKeyDown),this.jumpInput.addEventListener("blur",this.onBlur),this.element.appendChild(this.jumpInput);}show(){this.indicesOnShow=this.Reveal.getIndices(),this.Reveal.getRevealElement().appendChild(this.element),this.jumpInput.focus();}hide(){this.isVisible()&&(this.element.remove(),this.jumpInput.value="",clearTimeout(this.jumpTimeout),delete this.jumpTimeout);}isVisible(){return !!this.element.parentNode}jump(){clearTimeout(this.jumpTimeout),delete this.jumpTimeout;const e=this.jumpInput.value.trim("");let t=this.Reveal.location.getIndicesFromHash(e,{oneBasedIndex:!0});return !t&&/\S+/i.test(e)&&e.length>1&&(t=this.search(e)),t&&""!==e?(this.Reveal.slide(t.h,t.v,t.f),!0):(this.Reveal.slide(this.indicesOnShow.h,this.indicesOnShow.v,this.indicesOnShow.f),!1)}jumpAfter(e){clearTimeout(this.jumpTimeout),this.jumpTimeout=setTimeout((()=>this.jump()),e);}search(e){const t=new RegExp("\\b"+e.trim()+"\\b","i"),i=this.Reveal.getSlides().find((e=>t.test(e.innerText)));return i?this.Reveal.getIndices(i):null}cancel(){this.Reveal.slide(this.indicesOnShow.h,this.indicesOnShow.v,this.indicesOnShow.f),this.hide();}confirm(){this.jump(),this.hide();}destroy(){this.jumpInput.removeEventListener("input",this.onInput),this.jumpInput.removeEventListener("keydown",this.onKeyDown),this.jumpInput.removeEventListener("blur",this.onBlur),this.element.remove();}onKeyDown(e){13===e.keyCode?this.confirm():27===e.keyCode&&(this.cancel(),e.stopImmediatePropagation());}onInput(e){this.jumpAfter(200);}onBlur(){setTimeout((()=>this.hide()),1);}};const E=e=>{let t=e.match(/^#([0-9a-f]{3})$/i);if(t&&t[1])return t=t[1],{r:17*parseInt(t.charAt(0),16),g:17*parseInt(t.charAt(1),16),b:17*parseInt(t.charAt(2),16)};let i=e.match(/^#([0-9a-f]{6})$/i);if(i&&i[1])return i=i[1],{r:parseInt(i.slice(0,2),16),g:parseInt(i.slice(2,4),16),b:parseInt(i.slice(4,6),16)};let s=e.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);if(s)return {r:parseInt(s[1],10),g:parseInt(s[2],10),b:parseInt(s[3],10)};let n=e.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\,\s*([\d]+|[\d]*.[\d]+)\s*\)$/i);return n?{r:parseInt(n[1],10),g:parseInt(n[2],10),b:parseInt(n[3],10),a:parseFloat(n[4])}:null};class R{constructor(e){this.Reveal=e;}render(){this.element=document.createElement("div"),this.element.className="backgrounds",this.Reveal.getRevealElement().appendChild(this.element);}create(){this.element.innerHTML="",this.element.classList.add("no-transition"),this.Reveal.getHorizontalSlides().forEach((e=>{let i=this.createBackground(e,this.element);t$1(e,"section").forEach((e=>{this.createBackground(e,i),i.classList.add("stack");}));})),this.Reveal.getConfig().parallaxBackgroundImage?(this.element.style.backgroundImage='url("'+this.Reveal.getConfig().parallaxBackgroundImage+'")',this.element.style.backgroundSize=this.Reveal.getConfig().parallaxBackgroundSize,this.element.style.backgroundRepeat=this.Reveal.getConfig().parallaxBackgroundRepeat,this.element.style.backgroundPosition=this.Reveal.getConfig().parallaxBackgroundPosition,setTimeout((()=>{this.Reveal.getRevealElement().classList.add("has-parallax-background");}),1)):(this.element.style.backgroundImage="",this.Reveal.getRevealElement().classList.remove("has-parallax-background"));}createBackground(e,t){let i=document.createElement("div");i.className="slide-background "+e.className.replace(/present|past|future/,"");let s=document.createElement("div");return s.className="slide-background-content",i.appendChild(s),t.appendChild(i),e.slideBackgroundElement=i,e.slideBackgroundContentElement=s,this.sync(e),i}sync(e){const t=e.slideBackgroundElement,i=e.slideBackgroundContentElement,s={background:e.getAttribute("data-background"),backgroundSize:e.getAttribute("data-background-size"),backgroundImage:e.getAttribute("data-background-image"),backgroundVideo:e.getAttribute("data-background-video"),backgroundIframe:e.getAttribute("data-background-iframe"),backgroundColor:e.getAttribute("data-background-color"),backgroundGradient:e.getAttribute("data-background-gradient"),backgroundRepeat:e.getAttribute("data-background-repeat"),backgroundPosition:e.getAttribute("data-background-position"),backgroundTransition:e.getAttribute("data-background-transition"),backgroundOpacity:e.getAttribute("data-background-opacity")},n=e.hasAttribute("data-preload");e.classList.remove("has-dark-background"),e.classList.remove("has-light-background"),t.removeAttribute("data-loaded"),t.removeAttribute("data-background-hash"),t.removeAttribute("data-background-size"),t.removeAttribute("data-background-transition"),t.style.backgroundColor="",i.style.backgroundSize="",i.style.backgroundRepeat="",i.style.backgroundPosition="",i.style.backgroundImage="",i.style.opacity="",i.innerHTML="",s.background&&(/^(http|file|\/\/)/gi.test(s.background)||/\.(svg|png|jpg|jpeg|gif|bmp|webp)([?#\s]|$)/gi.test(s.background)?e.setAttribute("data-background-image",s.background):t.style.background=s.background),(s.background||s.backgroundColor||s.backgroundGradient||s.backgroundImage||s.backgroundVideo||s.backgroundIframe)&&t.setAttribute("data-background-hash",s.background+s.backgroundSize+s.backgroundImage+s.backgroundVideo+s.backgroundIframe+s.backgroundColor+s.backgroundGradient+s.backgroundRepeat+s.backgroundPosition+s.backgroundTransition+s.backgroundOpacity),s.backgroundSize&&t.setAttribute("data-background-size",s.backgroundSize),s.backgroundColor&&(t.style.backgroundColor=s.backgroundColor),s.backgroundGradient&&(t.style.backgroundImage=s.backgroundGradient),s.backgroundTransition&&t.setAttribute("data-background-transition",s.backgroundTransition),n&&t.setAttribute("data-preload",""),s.backgroundSize&&(i.style.backgroundSize=s.backgroundSize),s.backgroundRepeat&&(i.style.backgroundRepeat=s.backgroundRepeat),s.backgroundPosition&&(i.style.backgroundPosition=s.backgroundPosition),s.backgroundOpacity&&(i.style.opacity=s.backgroundOpacity);let a=s.backgroundColor;if(!a||!E(a)){let e=window.getComputedStyle(t);e&&e.backgroundColor&&(a=e.backgroundColor);}if(a){const t=E(a);t&&0!==t.a&&("string"==typeof(o=a)&&(o=E(o)),(o?(299*o.r+587*o.g+114*o.b)/1e3:null)<128?e.classList.add("has-dark-background"):e.classList.add("has-light-background"));}var o;}update(e=!1){let i=this.Reveal.getCurrentSlide(),s=this.Reveal.getIndices(),n=null,a=this.Reveal.getConfig().rtl?"future":"past",o=this.Reveal.getConfig().rtl?"past":"future";if(Array.from(this.element.childNodes).forEach(((i,r)=>{i.classList.remove("past","present","future"),r<s.h?i.classList.add(a):r>s.h?i.classList.add(o):(i.classList.add("present"),n=i),(e||r===s.h)&&t$1(i,".slide-background").forEach(((e,t)=>{e.classList.remove("past","present","future"),t<s.v?e.classList.add("past"):t>s.v?e.classList.add("future"):(e.classList.add("present"),r===s.h&&(n=e));}));})),this.previousBackground&&this.Reveal.slideContent.stopEmbeddedContent(this.previousBackground,{unloadIframes:!this.Reveal.slideContent.shouldPreload(this.previousBackground)}),n){this.Reveal.slideContent.startEmbeddedContent(n);let e=n.querySelector(".slide-background-content");if(e){let t=e.style.backgroundImage||"";/\.gif/i.test(t)&&(e.style.backgroundImage="",window.getComputedStyle(e).opacity,e.style.backgroundImage=t);}let t=this.previousBackground?this.previousBackground.getAttribute("data-background-hash"):null,i=n.getAttribute("data-background-hash");i&&i===t&&n!==this.previousBackground&&this.element.classList.add("no-transition"),this.previousBackground=n;}i&&["has-light-background","has-dark-background"].forEach((e=>{i.classList.contains(e)?this.Reveal.getRevealElement().classList.add(e):this.Reveal.getRevealElement().classList.remove(e);}),this),setTimeout((()=>{this.element.classList.remove("no-transition");}),1);}updateParallax(){let e=this.Reveal.getIndices();if(this.Reveal.getConfig().parallaxBackgroundImage){let t,i,s=this.Reveal.getHorizontalSlides(),n=this.Reveal.getVerticalSlides(),a=this.element.style.backgroundSize.split(" ");1===a.length?t=i=parseInt(a[0],10):(t=parseInt(a[0],10),i=parseInt(a[1],10));let o,r,l=this.element.offsetWidth,d=s.length;o="number"==typeof this.Reveal.getConfig().parallaxBackgroundHorizontal?this.Reveal.getConfig().parallaxBackgroundHorizontal:d>1?(t-l)/(d-1):0,r=o*e.h*-1;let c,h,u=this.element.offsetHeight,g=n.length;c="number"==typeof this.Reveal.getConfig().parallaxBackgroundVertical?this.Reveal.getConfig().parallaxBackgroundVertical:(i-u)/(g-1),h=g>0?c*e.v:0,this.element.style.backgroundPosition=r+"px "+-h+"px";}}destroy(){this.element.remove();}}const S$1=".slides section",A$1=".slides>section",k=".slides>section.present>section",L$1=/registerPlugin|registerKeyboardShortcut|addKeyBinding|addEventListener|showPreview/,C$1=/fade-(down|up|right|left|out|in-then-out|in-then-semi-out)|semi-fade-out|current-visible|shrink|grow/;let x$1=0;let P$1 = class P{constructor(e){this.Reveal=e;}run(e,t){this.reset();let i=this.Reveal.getSlides(),s=i.indexOf(t),n=i.indexOf(e);if(e.hasAttribute("data-auto-animate")&&t.hasAttribute("data-auto-animate")&&e.getAttribute("data-auto-animate-id")===t.getAttribute("data-auto-animate-id")&&!(s>n?t:e).hasAttribute("data-auto-animate-restart")){this.autoAnimateStyleSheet=this.autoAnimateStyleSheet||l$1();let i=this.getAutoAnimateOptions(t);e.dataset.autoAnimate="pending",t.dataset.autoAnimate="pending",i.slideDirection=s>n?"forward":"backward";let a="none"===e.style.display;a&&(e.style.display=this.Reveal.getConfig().display);let o=this.getAutoAnimatableElements(e,t).map((e=>this.autoAnimateElements(e.from,e.to,e.options||{},i,x$1++)));if(a&&(e.style.display="none"),"false"!==t.dataset.autoAnimateUnmatched&&!0===this.Reveal.getConfig().autoAnimateUnmatched){let e=.8*i.duration,s=.2*i.duration;this.getUnmatchedAutoAnimateElements(t).forEach((e=>{let t=this.getAutoAnimateOptions(e,i),s="unmatched";t.duration===i.duration&&t.delay===i.delay||(s="unmatched-"+x$1++,o.push(`[data-auto-animate="running"] [data-auto-animate-target="${s}"] { transition: opacity ${t.duration}s ease ${t.delay}s; }`)),e.dataset.autoAnimateTarget=s;}),this),o.push(`[data-auto-animate="running"] [data-auto-animate-target="unmatched"] { transition: opacity ${e}s ease ${s}s; }`);}this.autoAnimateStyleSheet.innerHTML=o.join(""),requestAnimationFrame((()=>{this.autoAnimateStyleSheet&&(getComputedStyle(this.autoAnimateStyleSheet).fontWeight,t.dataset.autoAnimate="running");})),this.Reveal.dispatchEvent({type:"autoanimate",data:{fromSlide:e,toSlide:t,sheet:this.autoAnimateStyleSheet}});}}reset(){t$1(this.Reveal.getRevealElement(),'[data-auto-animate]:not([data-auto-animate=""])').forEach((e=>{e.dataset.autoAnimate="";})),t$1(this.Reveal.getRevealElement(),"[data-auto-animate-target]").forEach((e=>{delete e.dataset.autoAnimateTarget;})),this.autoAnimateStyleSheet&&this.autoAnimateStyleSheet.parentNode&&(this.autoAnimateStyleSheet.parentNode.removeChild(this.autoAnimateStyleSheet),this.autoAnimateStyleSheet=null);}autoAnimateElements(e,t,i,s,n){e.dataset.autoAnimateTarget="",t.dataset.autoAnimateTarget=n;let a=this.getAutoAnimateOptions(t,s);void 0!==i.delay&&(a.delay=i.delay),void 0!==i.duration&&(a.duration=i.duration),void 0!==i.easing&&(a.easing=i.easing);let o=this.getAutoAnimatableProperties("from",e,i),r=this.getAutoAnimatableProperties("to",t,i);if(t.classList.contains("fragment")&&(delete r.styles.opacity,e.classList.contains("fragment"))){(e.className.match(C$1)||[""])[0]===(t.className.match(C$1)||[""])[0]&&"forward"===s.slideDirection&&t.classList.add("visible","disabled");}if(!1!==i.translate||!1!==i.scale){let e=this.Reveal.getScale(),t={x:(o.x-r.x)/e,y:(o.y-r.y)/e,scaleX:o.width/r.width,scaleY:o.height/r.height};t.x=Math.round(1e3*t.x)/1e3,t.y=Math.round(1e3*t.y)/1e3,t.scaleX=Math.round(1e3*t.scaleX)/1e3,t.scaleX=Math.round(1e3*t.scaleX)/1e3;let s=!1!==i.translate&&(0!==t.x||0!==t.y),n=!1!==i.scale&&(0!==t.scaleX||0!==t.scaleY);if(s||n){let e=[];s&&e.push(`translate(${t.x}px, ${t.y}px)`),n&&e.push(`scale(${t.scaleX}, ${t.scaleY})`),o.styles.transform=e.join(" "),o.styles["transform-origin"]="top left",r.styles.transform="none";}}for(let e in r.styles){const t=r.styles[e],i=o.styles[e];t===i?delete r.styles[e]:(!0===t.explicitValue&&(r.styles[e]=t.value),!0===i.explicitValue&&(o.styles[e]=i.value));}let l="",d=Object.keys(r.styles);if(d.length>0){o.styles.transition="none",r.styles.transition=`all ${a.duration}s ${a.easing} ${a.delay}s`,r.styles["transition-property"]=d.join(", "),r.styles["will-change"]=d.join(", "),l='[data-auto-animate-target="'+n+'"] {'+Object.keys(o.styles).map((e=>e+": "+o.styles[e]+" !important;")).join("")+'}[data-auto-animate="running"] [data-auto-animate-target="'+n+'"] {'+Object.keys(r.styles).map((e=>e+": "+r.styles[e]+" !important;")).join("")+"}";}return l}getAutoAnimateOptions(t,i){let s={easing:this.Reveal.getConfig().autoAnimateEasing,duration:this.Reveal.getConfig().autoAnimateDuration,delay:0};if(s=e$1(s,i),t.parentNode){let e=o$1(t.parentNode,"[data-auto-animate-target]");e&&(s=this.getAutoAnimateOptions(e,s));}return t.dataset.autoAnimateEasing&&(s.easing=t.dataset.autoAnimateEasing),t.dataset.autoAnimateDuration&&(s.duration=parseFloat(t.dataset.autoAnimateDuration)),t.dataset.autoAnimateDelay&&(s.delay=parseFloat(t.dataset.autoAnimateDelay)),s}getAutoAnimatableProperties(e,t,i){let s=this.Reveal.getConfig(),n={styles:[]};if(!1!==i.translate||!1!==i.scale){let e;if("function"==typeof i.measure)e=i.measure(t);else if(s.center)e=t.getBoundingClientRect();else {let i=this.Reveal.getScale();e={x:t.offsetLeft*i,y:t.offsetTop*i,width:t.offsetWidth*i,height:t.offsetHeight*i};}n.x=e.x,n.y=e.y,n.width=e.width,n.height=e.height;}const a=getComputedStyle(t);return (i.styles||s.autoAnimateStyles).forEach((t=>{let i;"string"==typeof t&&(t={property:t}),void 0!==t.from&&"from"===e?i={value:t.from,explicitValue:!0}:void 0!==t.to&&"to"===e?i={value:t.to,explicitValue:!0}:("line-height"===t.property&&(i=parseFloat(a["line-height"])/parseFloat(a["font-size"])),isNaN(i)&&(i=a[t.property])),""!==i&&(n.styles[t.property]=i);})),n}getAutoAnimatableElements(e,t){let i=("function"==typeof this.Reveal.getConfig().autoAnimateMatcher?this.Reveal.getConfig().autoAnimateMatcher:this.getAutoAnimatePairs).call(this,e,t),s=[];return i.filter(((e,t)=>{if(-1===s.indexOf(e.to))return s.push(e.to),!0}))}getAutoAnimatePairs(e,t){let i=[];const s="h1, h2, h3, h4, h5, h6, p, li";return this.findAutoAnimateMatches(i,e,t,"[data-id]",(e=>e.nodeName+":::"+e.getAttribute("data-id"))),this.findAutoAnimateMatches(i,e,t,s,(e=>e.nodeName+":::"+e.innerText)),this.findAutoAnimateMatches(i,e,t,"img, video, iframe",(e=>e.nodeName+":::"+(e.getAttribute("src")||e.getAttribute("data-src")))),this.findAutoAnimateMatches(i,e,t,"pre",(e=>e.nodeName+":::"+e.innerText)),i.forEach((e=>{a$1(e.from,s)?e.options={scale:!1}:a$1(e.from,"pre")&&(e.options={scale:!1,styles:["width","height"]},this.findAutoAnimateMatches(i,e.from,e.to,".hljs .hljs-ln-code",(e=>e.textContent),{scale:!1,styles:[],measure:this.getLocalBoundingBox.bind(this)}),this.findAutoAnimateMatches(i,e.from,e.to,".hljs .hljs-ln-numbers[data-line-number]",(e=>e.getAttribute("data-line-number")),{scale:!1,styles:["width"],measure:this.getLocalBoundingBox.bind(this)}));}),this),i}getLocalBoundingBox(e){const t=this.Reveal.getScale();return {x:Math.round(e.offsetLeft*t*100)/100,y:Math.round(e.offsetTop*t*100)/100,width:Math.round(e.offsetWidth*t*100)/100,height:Math.round(e.offsetHeight*t*100)/100}}findAutoAnimateMatches(e,t,i,s,n,a){let o={},r={};[].slice.call(t.querySelectorAll(s)).forEach(((e,t)=>{const i=n(e);"string"==typeof i&&i.length&&(o[i]=o[i]||[],o[i].push(e));})),[].slice.call(i.querySelectorAll(s)).forEach(((t,i)=>{const s=n(t);let l;if(r[s]=r[s]||[],r[s].push(t),o[s]){const e=r[s].length-1,t=o[s].length-1;o[s][e]?(l=o[s][e],o[s][e]=null):o[s][t]&&(l=o[s][t],o[s][t]=null);}l&&e.push({from:l,to:t,options:a});}));}getUnmatchedAutoAnimateElements(e){return [].slice.call(e.children).reduce(((e,t)=>{const i=t.querySelector("[data-auto-animate-target]");return t.hasAttribute("data-auto-animate-target")||i||e.push(t),t.querySelector("[data-auto-animate-target]")&&(e=e.concat(this.getUnmatchedAutoAnimateElements(t))),e}),[])}};let N$1 = class N{constructor(e){this.Reveal=e;}configure(e,t){!1===e.fragments?this.disable():!1===t.fragments&&this.enable();}disable(){t$1(this.Reveal.getSlidesElement(),".fragment").forEach((e=>{e.classList.add("visible"),e.classList.remove("current-fragment");}));}enable(){t$1(this.Reveal.getSlidesElement(),".fragment").forEach((e=>{e.classList.remove("visible"),e.classList.remove("current-fragment");}));}availableRoutes(){let e=this.Reveal.getCurrentSlide();if(e&&this.Reveal.getConfig().fragments){let t=e.querySelectorAll(".fragment:not(.disabled)"),i=e.querySelectorAll(".fragment:not(.disabled):not(.visible)");return {prev:t.length-i.length>0,next:!!i.length}}return {prev:!1,next:!1}}sort(e,t=!1){e=Array.from(e);let i=[],s=[],n=[];e.forEach((e=>{if(e.hasAttribute("data-fragment-index")){let t=parseInt(e.getAttribute("data-fragment-index"),10);i[t]||(i[t]=[]),i[t].push(e);}else s.push([e]);})),i=i.concat(s);let a=0;return i.forEach((e=>{e.forEach((e=>{n.push(e),e.setAttribute("data-fragment-index",a);})),a++;})),!0===t?i:n}sortAll(){this.Reveal.getHorizontalSlides().forEach((e=>{let i=t$1(e,"section");i.forEach(((e,t)=>{this.sort(e.querySelectorAll(".fragment"));}),this),0===i.length&&this.sort(e.querySelectorAll(".fragment"));}));}update(e,t){let i={shown:[],hidden:[]},s=this.Reveal.getCurrentSlide();if(s&&this.Reveal.getConfig().fragments&&(t=t||this.sort(s.querySelectorAll(".fragment"))).length){let n=0;if("number"!=typeof e){let t=this.sort(s.querySelectorAll(".fragment.visible")).pop();t&&(e=parseInt(t.getAttribute("data-fragment-index")||0,10));}Array.from(t).forEach(((t,s)=>{if(t.hasAttribute("data-fragment-index")&&(s=parseInt(t.getAttribute("data-fragment-index"),10)),n=Math.max(n,s),s<=e){let n=t.classList.contains("visible");t.classList.add("visible"),t.classList.remove("current-fragment"),s===e&&(this.Reveal.announceStatus(this.Reveal.getStatusText(t)),t.classList.add("current-fragment"),this.Reveal.slideContent.startEmbeddedContent(t)),n||(i.shown.push(t),this.Reveal.dispatchEvent({target:t,type:"visible",bubbles:!1}));}else {let e=t.classList.contains("visible");t.classList.remove("visible"),t.classList.remove("current-fragment"),e&&(this.Reveal.slideContent.stopEmbeddedContent(t),i.hidden.push(t),this.Reveal.dispatchEvent({target:t,type:"hidden",bubbles:!1}));}})),e="number"==typeof e?e:-1,e=Math.max(Math.min(e,n),-1),s.setAttribute("data-fragment",e);}return i}sync(e=this.Reveal.getCurrentSlide()){return this.sort(e.querySelectorAll(".fragment"))}goto(e,t=0){let i=this.Reveal.getCurrentSlide();if(i&&this.Reveal.getConfig().fragments){let s=this.sort(i.querySelectorAll(".fragment:not(.disabled)"));if(s.length){if("number"!=typeof e){let t=this.sort(i.querySelectorAll(".fragment:not(.disabled).visible")).pop();e=t?parseInt(t.getAttribute("data-fragment-index")||0,10):-1;}e+=t;let n=this.update(e,s);return n.hidden.length&&this.Reveal.dispatchEvent({type:"fragmenthidden",data:{fragment:n.hidden[0],fragments:n.hidden}}),n.shown.length&&this.Reveal.dispatchEvent({type:"fragmentshown",data:{fragment:n.shown[0],fragments:n.shown}}),this.Reveal.controls.update(),this.Reveal.progress.update(),this.Reveal.getConfig().fragmentInURL&&this.Reveal.location.writeURL(),!(!n.shown.length&&!n.hidden.length)}}return !1}next(){return this.goto(null,1)}prev(){return this.goto(null,-1)}};let M$1 = class M{constructor(e){this.Reveal=e,this.active=!1,this.onSlideClicked=this.onSlideClicked.bind(this);}activate(){if(this.Reveal.getConfig().overview&&!this.isActive()){this.active=!0,this.Reveal.getRevealElement().classList.add("overview"),this.Reveal.cancelAutoSlide(),this.Reveal.getSlidesElement().appendChild(this.Reveal.getBackgroundsElement()),t$1(this.Reveal.getRevealElement(),S$1).forEach((e=>{e.classList.contains("stack")||e.addEventListener("click",this.onSlideClicked,!0);}));const e=70,i=this.Reveal.getComputedSlideSize();this.overviewSlideWidth=i.width+e,this.overviewSlideHeight=i.height+e,this.Reveal.getConfig().rtl&&(this.overviewSlideWidth=-this.overviewSlideWidth),this.Reveal.updateSlidesVisibility(),this.layout(),this.update(),this.Reveal.layout();const s=this.Reveal.getIndices();this.Reveal.dispatchEvent({type:"overviewshown",data:{indexh:s.h,indexv:s.v,currentSlide:this.Reveal.getCurrentSlide()}});}}layout(){this.Reveal.getHorizontalSlides().forEach(((e,i)=>{e.setAttribute("data-index-h",i),n$1(e,"translate3d("+i*this.overviewSlideWidth+"px, 0, 0)"),e.classList.contains("stack")&&t$1(e,"section").forEach(((e,t)=>{e.setAttribute("data-index-h",i),e.setAttribute("data-index-v",t),n$1(e,"translate3d(0, "+t*this.overviewSlideHeight+"px, 0)");}));})),Array.from(this.Reveal.getBackgroundsElement().childNodes).forEach(((e,i)=>{n$1(e,"translate3d("+i*this.overviewSlideWidth+"px, 0, 0)"),t$1(e,".slide-background").forEach(((e,t)=>{n$1(e,"translate3d(0, "+t*this.overviewSlideHeight+"px, 0)");}));}));}update(){const e=Math.min(window.innerWidth,window.innerHeight),t=Math.max(e/5,150)/e,i=this.Reveal.getIndices();this.Reveal.transformSlides({overview:["scale("+t+")","translateX("+-i.h*this.overviewSlideWidth+"px)","translateY("+-i.v*this.overviewSlideHeight+"px)"].join(" ")});}deactivate(){if(this.Reveal.getConfig().overview){this.active=!1,this.Reveal.getRevealElement().classList.remove("overview"),this.Reveal.getRevealElement().classList.add("overview-deactivating"),setTimeout((()=>{this.Reveal.getRevealElement().classList.remove("overview-deactivating");}),1),this.Reveal.getRevealElement().appendChild(this.Reveal.getBackgroundsElement()),t$1(this.Reveal.getRevealElement(),S$1).forEach((e=>{n$1(e,""),e.removeEventListener("click",this.onSlideClicked,!0);})),t$1(this.Reveal.getBackgroundsElement(),".slide-background").forEach((e=>{n$1(e,"");})),this.Reveal.transformSlides({overview:""});const e=this.Reveal.getIndices();this.Reveal.slide(e.h,e.v),this.Reveal.layout(),this.Reveal.cueAutoSlide(),this.Reveal.dispatchEvent({type:"overviewhidden",data:{indexh:e.h,indexv:e.v,currentSlide:this.Reveal.getCurrentSlide()}});}}toggle(e){"boolean"==typeof e?e?this.activate():this.deactivate():this.isActive()?this.deactivate():this.activate();}isActive(){return this.active}onSlideClicked(e){if(this.isActive()){e.preventDefault();let t=e.target;for(;t&&!t.nodeName.match(/section/gi);)t=t.parentNode;if(t&&!t.classList.contains("disabled")&&(this.deactivate(),t.nodeName.match(/section/gi))){let e=parseInt(t.getAttribute("data-index-h"),10),i=parseInt(t.getAttribute("data-index-v"),10);this.Reveal.slide(e,i);}}}};class I{constructor(e){this.Reveal=e,this.shortcuts={},this.bindings={},this.onDocumentKeyDown=this.onDocumentKeyDown.bind(this),this.onDocumentKeyPress=this.onDocumentKeyPress.bind(this);}configure(e,t){"linear"===e.navigationMode?(this.shortcuts["&#8594;  ,  &#8595;  ,  SPACE  ,  N  ,  L  ,  J"]="Next slide",this.shortcuts["&#8592;  ,  &#8593;  ,  P  ,  H  ,  K"]="Previous slide"):(this.shortcuts["N  ,  SPACE"]="Next slide",this.shortcuts["P  ,  Shift SPACE"]="Previous slide",this.shortcuts["&#8592;  ,  H"]="Navigate left",this.shortcuts["&#8594;  ,  L"]="Navigate right",this.shortcuts["&#8593;  ,  K"]="Navigate up",this.shortcuts["&#8595;  ,  J"]="Navigate down"),this.shortcuts["Alt + &#8592;/&#8593/&#8594;/&#8595;"]="Navigate without fragments",this.shortcuts["Shift + &#8592;/&#8593/&#8594;/&#8595;"]="Jump to first/last slide",this.shortcuts["B  ,  ."]="Pause",this.shortcuts.F="Fullscreen",this.shortcuts.G="Jump to slide",this.shortcuts["ESC, O"]="Slide overview";}bind(){document.addEventListener("keydown",this.onDocumentKeyDown,!1),document.addEventListener("keypress",this.onDocumentKeyPress,!1);}unbind(){document.removeEventListener("keydown",this.onDocumentKeyDown,!1),document.removeEventListener("keypress",this.onDocumentKeyPress,!1);}addKeyBinding(e,t){"object"==typeof e&&e.keyCode?this.bindings[e.keyCode]={callback:t,key:e.key,description:e.description}:this.bindings[e]={callback:t,key:null,description:null};}removeKeyBinding(e){delete this.bindings[e];}triggerKey(e){this.onDocumentKeyDown({keyCode:e});}registerKeyboardShortcut(e,t){this.shortcuts[e]=t;}getShortcuts(){return this.shortcuts}getBindings(){return this.bindings}onDocumentKeyPress(e){e.shiftKey&&63===e.charCode&&this.Reveal.toggleHelp();}onDocumentKeyDown(e){let t=this.Reveal.getConfig();if("function"==typeof t.keyboardCondition&&!1===t.keyboardCondition(e))return !0;if("focused"===t.keyboardCondition&&!this.Reveal.isFocused())return !0;let i=e.keyCode,s=!this.Reveal.isAutoSliding();this.Reveal.onUserInput(e);let n=document.activeElement&&!0===document.activeElement.isContentEditable,a=document.activeElement&&document.activeElement.tagName&&/input|textarea/i.test(document.activeElement.tagName),o=document.activeElement&&document.activeElement.className&&/speaker-notes/i.test(document.activeElement.className),r=!(-1!==[32,37,38,39,40,78,80].indexOf(e.keyCode)&&e.shiftKey||e.altKey)&&(e.shiftKey||e.altKey||e.ctrlKey||e.metaKey);if(n||a||o||r)return;let l,d=[66,86,190,191];if("object"==typeof t.keyboard)for(l in t.keyboard)"togglePause"===t.keyboard[l]&&d.push(parseInt(l,10));if(this.Reveal.isPaused()&&-1===d.indexOf(i))return !1;let c="linear"===t.navigationMode||!this.Reveal.hasHorizontalSlides()||!this.Reveal.hasVerticalSlides(),h=!1;if("object"==typeof t.keyboard)for(l in t.keyboard)if(parseInt(l,10)===i){let i=t.keyboard[l];"function"==typeof i?i.apply(null,[e]):"string"==typeof i&&"function"==typeof this.Reveal[i]&&this.Reveal[i].call(),h=!0;}if(!1===h)for(l in this.bindings)if(parseInt(l,10)===i){let t=this.bindings[l].callback;"function"==typeof t?t.apply(null,[e]):"string"==typeof t&&"function"==typeof this.Reveal[t]&&this.Reveal[t].call(),h=!0;}!1===h&&(h=!0,80===i||33===i?this.Reveal.prev({skipFragments:e.altKey}):78===i||34===i?this.Reveal.next({skipFragments:e.altKey}):72===i||37===i?e.shiftKey?this.Reveal.slide(0):!this.Reveal.overview.isActive()&&c?this.Reveal.prev({skipFragments:e.altKey}):this.Reveal.left({skipFragments:e.altKey}):76===i||39===i?e.shiftKey?this.Reveal.slide(this.Reveal.getHorizontalSlides().length-1):!this.Reveal.overview.isActive()&&c?this.Reveal.next({skipFragments:e.altKey}):this.Reveal.right({skipFragments:e.altKey}):75===i||38===i?e.shiftKey?this.Reveal.slide(void 0,0):!this.Reveal.overview.isActive()&&c?this.Reveal.prev({skipFragments:e.altKey}):this.Reveal.up({skipFragments:e.altKey}):74===i||40===i?e.shiftKey?this.Reveal.slide(void 0,Number.MAX_VALUE):!this.Reveal.overview.isActive()&&c?this.Reveal.next({skipFragments:e.altKey}):this.Reveal.down({skipFragments:e.altKey}):36===i?this.Reveal.slide(0):35===i?this.Reveal.slide(this.Reveal.getHorizontalSlides().length-1):32===i?(this.Reveal.overview.isActive()&&this.Reveal.overview.deactivate(),e.shiftKey?this.Reveal.prev({skipFragments:e.altKey}):this.Reveal.next({skipFragments:e.altKey})):58===i||59===i||66===i||86===i||190===i||191===i?this.Reveal.togglePause():70===i?(e=>{let t=(e=e||document.documentElement).requestFullscreen||e.webkitRequestFullscreen||e.webkitRequestFullScreen||e.mozRequestFullScreen||e.msRequestFullscreen;t&&t.apply(e);})(t.embedded?this.Reveal.getViewportElement():document.documentElement):65===i?t.autoSlideStoppable&&this.Reveal.toggleAutoSlide(s):71===i?t.jumpToSlide&&this.Reveal.toggleJumpToSlide():h=!1),h?e.preventDefault&&e.preventDefault():27!==i&&79!==i||(!1===this.Reveal.closeOverlay()&&this.Reveal.overview.toggle(),e.preventDefault&&e.preventDefault()),this.Reveal.cueAutoSlide();}}class D{constructor(e){var t,i,s;s=1e3,(i="MAX_REPLACE_STATE_FREQUENCY")in(t=this)?Object.defineProperty(t,i,{value:s,enumerable:!0,configurable:!0,writable:!0}):t[i]=s,this.Reveal=e,this.writeURLTimeout=0,this.replaceStateTimestamp=0,this.onWindowHashChange=this.onWindowHashChange.bind(this);}bind(){window.addEventListener("hashchange",this.onWindowHashChange,!1);}unbind(){window.removeEventListener("hashchange",this.onWindowHashChange,!1);}getIndicesFromHash(e=window.location.hash,t={}){let i=e.replace(/^#\/?/,""),s=i.split("/");if(/^[0-9]*$/.test(s[0])||!i.length){const e=this.Reveal.getConfig();let i,n=e.hashOneBasedIndex||t.oneBasedIndex?1:0,a=parseInt(s[0],10)-n||0,o=parseInt(s[1],10)-n||0;return e.fragmentInURL&&(i=parseInt(s[2],10),isNaN(i)&&(i=void 0)),{h:a,v:o,f:i}}{let e,t;/\/[-\d]+$/g.test(i)&&(t=parseInt(i.split("/").pop(),10),t=isNaN(t)?void 0:t,i=i.split("/").shift());try{e=document.getElementById(decodeURIComponent(i)).closest(".slides>section, .slides>section>section");}catch(e){}if(e)return {...this.Reveal.getIndices(e),f:t}}return null}readURL(){const e=this.Reveal.getIndices(),t=this.getIndicesFromHash();t?t.h===e.h&&t.v===e.v&&void 0===t.f||this.Reveal.slide(t.h,t.v,t.f):this.Reveal.slide(e.h||0,e.v||0);}writeURL(e){let t=this.Reveal.getConfig(),i=this.Reveal.getCurrentSlide();if(clearTimeout(this.writeURLTimeout),"number"==typeof e)this.writeURLTimeout=setTimeout(this.writeURL,e);else if(i){let e=this.getHash();t.history?window.location.hash=e:t.hash&&("/"===e?this.debouncedReplaceState(window.location.pathname+window.location.search):this.debouncedReplaceState("#"+e));}}replaceState(e){window.history.replaceState(null,null,e),this.replaceStateTimestamp=Date.now();}debouncedReplaceState(e){clearTimeout(this.replaceStateTimeout),Date.now()-this.replaceStateTimestamp>this.MAX_REPLACE_STATE_FREQUENCY?this.replaceState(e):this.replaceStateTimeout=setTimeout((()=>this.replaceState(e)),this.MAX_REPLACE_STATE_FREQUENCY);}getHash(e){let t="/",i=e||this.Reveal.getCurrentSlide(),s=i?i.getAttribute("id"):null;s&&(s=encodeURIComponent(s));let n=this.Reveal.getIndices(e);if(this.Reveal.getConfig().fragmentInURL||(n.f=void 0),"string"==typeof s&&s.length)t="/"+s,n.f>=0&&(t+="/"+n.f);else {let e=this.Reveal.getConfig().hashOneBasedIndex?1:0;(n.h>0||n.v>0||n.f>=0)&&(t+=n.h+e),(n.v>0||n.f>=0)&&(t+="/"+(n.v+e)),n.f>=0&&(t+="/"+n.f);}return t}onWindowHashChange(e){this.readURL();}}let T$1 = class T{constructor(e){this.Reveal=e,this.onNavigateLeftClicked=this.onNavigateLeftClicked.bind(this),this.onNavigateRightClicked=this.onNavigateRightClicked.bind(this),this.onNavigateUpClicked=this.onNavigateUpClicked.bind(this),this.onNavigateDownClicked=this.onNavigateDownClicked.bind(this),this.onNavigatePrevClicked=this.onNavigatePrevClicked.bind(this),this.onNavigateNextClicked=this.onNavigateNextClicked.bind(this);}render(){const e=this.Reveal.getConfig().rtl,i=this.Reveal.getRevealElement();this.element=document.createElement("aside"),this.element.className="controls",this.element.innerHTML=`<button class="navigate-left" aria-label="${e?"next slide":"previous slide"}"><div class="controls-arrow"></div></button>\n\t\t\t<button class="navigate-right" aria-label="${e?"previous slide":"next slide"}"><div class="controls-arrow"></div></button>\n\t\t\t<button class="navigate-up" aria-label="above slide"><div class="controls-arrow"></div></button>\n\t\t\t<button class="navigate-down" aria-label="below slide"><div class="controls-arrow"></div></button>`,this.Reveal.getRevealElement().appendChild(this.element),this.controlsLeft=t$1(i,".navigate-left"),this.controlsRight=t$1(i,".navigate-right"),this.controlsUp=t$1(i,".navigate-up"),this.controlsDown=t$1(i,".navigate-down"),this.controlsPrev=t$1(i,".navigate-prev"),this.controlsNext=t$1(i,".navigate-next"),this.controlsRightArrow=this.element.querySelector(".navigate-right"),this.controlsLeftArrow=this.element.querySelector(".navigate-left"),this.controlsDownArrow=this.element.querySelector(".navigate-down");}configure(e,t){this.element.style.display=e.controls?"block":"none",this.element.setAttribute("data-controls-layout",e.controlsLayout),this.element.setAttribute("data-controls-back-arrows",e.controlsBackArrows);}bind(){let e=["touchstart","click"];v$1&&(e=["touchstart"]),e.forEach((e=>{this.controlsLeft.forEach((t=>t.addEventListener(e,this.onNavigateLeftClicked,!1))),this.controlsRight.forEach((t=>t.addEventListener(e,this.onNavigateRightClicked,!1))),this.controlsUp.forEach((t=>t.addEventListener(e,this.onNavigateUpClicked,!1))),this.controlsDown.forEach((t=>t.addEventListener(e,this.onNavigateDownClicked,!1))),this.controlsPrev.forEach((t=>t.addEventListener(e,this.onNavigatePrevClicked,!1))),this.controlsNext.forEach((t=>t.addEventListener(e,this.onNavigateNextClicked,!1)));}));}unbind(){["touchstart","click"].forEach((e=>{this.controlsLeft.forEach((t=>t.removeEventListener(e,this.onNavigateLeftClicked,!1))),this.controlsRight.forEach((t=>t.removeEventListener(e,this.onNavigateRightClicked,!1))),this.controlsUp.forEach((t=>t.removeEventListener(e,this.onNavigateUpClicked,!1))),this.controlsDown.forEach((t=>t.removeEventListener(e,this.onNavigateDownClicked,!1))),this.controlsPrev.forEach((t=>t.removeEventListener(e,this.onNavigatePrevClicked,!1))),this.controlsNext.forEach((t=>t.removeEventListener(e,this.onNavigateNextClicked,!1)));}));}update(){let e=this.Reveal.availableRoutes();[...this.controlsLeft,...this.controlsRight,...this.controlsUp,...this.controlsDown,...this.controlsPrev,...this.controlsNext].forEach((e=>{e.classList.remove("enabled","fragmented"),e.setAttribute("disabled","disabled");})),e.left&&this.controlsLeft.forEach((e=>{e.classList.add("enabled"),e.removeAttribute("disabled");})),e.right&&this.controlsRight.forEach((e=>{e.classList.add("enabled"),e.removeAttribute("disabled");})),e.up&&this.controlsUp.forEach((e=>{e.classList.add("enabled"),e.removeAttribute("disabled");})),e.down&&this.controlsDown.forEach((e=>{e.classList.add("enabled"),e.removeAttribute("disabled");})),(e.left||e.up)&&this.controlsPrev.forEach((e=>{e.classList.add("enabled"),e.removeAttribute("disabled");})),(e.right||e.down)&&this.controlsNext.forEach((e=>{e.classList.add("enabled"),e.removeAttribute("disabled");}));let t=this.Reveal.getCurrentSlide();if(t){let e=this.Reveal.fragments.availableRoutes();e.prev&&this.controlsPrev.forEach((e=>{e.classList.add("fragmented","enabled"),e.removeAttribute("disabled");})),e.next&&this.controlsNext.forEach((e=>{e.classList.add("fragmented","enabled"),e.removeAttribute("disabled");})),this.Reveal.isVerticalSlide(t)?(e.prev&&this.controlsUp.forEach((e=>{e.classList.add("fragmented","enabled"),e.removeAttribute("disabled");})),e.next&&this.controlsDown.forEach((e=>{e.classList.add("fragmented","enabled"),e.removeAttribute("disabled");}))):(e.prev&&this.controlsLeft.forEach((e=>{e.classList.add("fragmented","enabled"),e.removeAttribute("disabled");})),e.next&&this.controlsRight.forEach((e=>{e.classList.add("fragmented","enabled"),e.removeAttribute("disabled");})));}if(this.Reveal.getConfig().controlsTutorial){let t=this.Reveal.getIndices();!this.Reveal.hasNavigatedVertically()&&e.down?this.controlsDownArrow.classList.add("highlight"):(this.controlsDownArrow.classList.remove("highlight"),this.Reveal.getConfig().rtl?!this.Reveal.hasNavigatedHorizontally()&&e.left&&0===t.v?this.controlsLeftArrow.classList.add("highlight"):this.controlsLeftArrow.classList.remove("highlight"):!this.Reveal.hasNavigatedHorizontally()&&e.right&&0===t.v?this.controlsRightArrow.classList.add("highlight"):this.controlsRightArrow.classList.remove("highlight"));}}destroy(){this.unbind(),this.element.remove();}onNavigateLeftClicked(e){e.preventDefault(),this.Reveal.onUserInput(),"linear"===this.Reveal.getConfig().navigationMode?this.Reveal.prev():this.Reveal.left();}onNavigateRightClicked(e){e.preventDefault(),this.Reveal.onUserInput(),"linear"===this.Reveal.getConfig().navigationMode?this.Reveal.next():this.Reveal.right();}onNavigateUpClicked(e){e.preventDefault(),this.Reveal.onUserInput(),this.Reveal.up();}onNavigateDownClicked(e){e.preventDefault(),this.Reveal.onUserInput(),this.Reveal.down();}onNavigatePrevClicked(e){e.preventDefault(),this.Reveal.onUserInput(),this.Reveal.prev();}onNavigateNextClicked(e){e.preventDefault(),this.Reveal.onUserInput(),this.Reveal.next();}};class F{constructor(e){this.Reveal=e,this.onProgressClicked=this.onProgressClicked.bind(this);}render(){this.element=document.createElement("div"),this.element.className="progress",this.Reveal.getRevealElement().appendChild(this.element),this.bar=document.createElement("span"),this.element.appendChild(this.bar);}configure(e,t){this.element.style.display=e.progress?"block":"none";}bind(){this.Reveal.getConfig().progress&&this.element&&this.element.addEventListener("click",this.onProgressClicked,!1);}unbind(){this.Reveal.getConfig().progress&&this.element&&this.element.removeEventListener("click",this.onProgressClicked,!1);}update(){if(this.Reveal.getConfig().progress&&this.bar){let e=this.Reveal.getProgress();this.Reveal.getTotalSlides()<2&&(e=0),this.bar.style.transform="scaleX("+e+")";}}getMaxWidth(){return this.Reveal.getRevealElement().offsetWidth}onProgressClicked(e){this.Reveal.onUserInput(e),e.preventDefault();let t=this.Reveal.getSlides(),i=t.length,s=Math.floor(e.clientX/this.getMaxWidth()*i);this.Reveal.getConfig().rtl&&(s=i-s);let n=this.Reveal.getIndices(t[s]);this.Reveal.slide(n.h,n.v);}destroy(){this.element.remove();}}class z{constructor(e){this.Reveal=e,this.lastMouseWheelStep=0,this.cursorHidden=!1,this.cursorInactiveTimeout=0,this.onDocumentCursorActive=this.onDocumentCursorActive.bind(this),this.onDocumentMouseScroll=this.onDocumentMouseScroll.bind(this);}configure(e,t){e.mouseWheel?(document.addEventListener("DOMMouseScroll",this.onDocumentMouseScroll,!1),document.addEventListener("mousewheel",this.onDocumentMouseScroll,!1)):(document.removeEventListener("DOMMouseScroll",this.onDocumentMouseScroll,!1),document.removeEventListener("mousewheel",this.onDocumentMouseScroll,!1)),e.hideInactiveCursor?(document.addEventListener("mousemove",this.onDocumentCursorActive,!1),document.addEventListener("mousedown",this.onDocumentCursorActive,!1)):(this.showCursor(),document.removeEventListener("mousemove",this.onDocumentCursorActive,!1),document.removeEventListener("mousedown",this.onDocumentCursorActive,!1));}showCursor(){this.cursorHidden&&(this.cursorHidden=!1,this.Reveal.getRevealElement().style.cursor="");}hideCursor(){!1===this.cursorHidden&&(this.cursorHidden=!0,this.Reveal.getRevealElement().style.cursor="none");}destroy(){this.showCursor(),document.removeEventListener("DOMMouseScroll",this.onDocumentMouseScroll,!1),document.removeEventListener("mousewheel",this.onDocumentMouseScroll,!1),document.removeEventListener("mousemove",this.onDocumentCursorActive,!1),document.removeEventListener("mousedown",this.onDocumentCursorActive,!1);}onDocumentCursorActive(e){this.showCursor(),clearTimeout(this.cursorInactiveTimeout),this.cursorInactiveTimeout=setTimeout(this.hideCursor.bind(this),this.Reveal.getConfig().hideCursorTime);}onDocumentMouseScroll(e){if(Date.now()-this.lastMouseWheelStep>1e3){this.lastMouseWheelStep=Date.now();let t=e.detail||-e.wheelDelta;t>0?this.Reveal.next():t<0&&this.Reveal.prev();}}}const H=(e,t)=>{const i=document.createElement("script");i.type="text/javascript",i.async=!1,i.defer=!1,i.src=e,"function"==typeof t&&(i.onload=i.onreadystatechange=e=>{("load"===e.type||/loaded|complete/.test(i.readyState))&&(i.onload=i.onreadystatechange=i.onerror=null,t());},i.onerror=e=>{i.onload=i.onreadystatechange=i.onerror=null,t(new Error("Failed loading script: "+i.src+"\n"+e));});const s=document.querySelector("head");s.insertBefore(i,s.lastChild);};class B{constructor(e){this.Reveal=e,this.state="idle",this.registeredPlugins={},this.asyncDependencies=[];}load(e,t){return this.state="loading",e.forEach(this.registerPlugin.bind(this)),new Promise((e=>{let i=[],s=0;if(t.forEach((e=>{e.condition&&!e.condition()||(e.async?this.asyncDependencies.push(e):i.push(e));})),i.length){s=i.length;const t=t=>{t&&"function"==typeof t.callback&&t.callback(),0==--s&&this.initPlugins().then(e);};i.forEach((e=>{"string"==typeof e.id?(this.registerPlugin(e),t(e)):"string"==typeof e.src?H(e.src,(()=>t(e))):(console.warn("Unrecognized plugin format",e),t());}));}else this.initPlugins().then(e);}))}initPlugins(){return new Promise((e=>{let t=Object.values(this.registeredPlugins),i=t.length;if(0===i)this.loadAsync().then(e);else {let s,n=()=>{0==--i?this.loadAsync().then(e):s();},a=0;s=()=>{let e=t[a++];if("function"==typeof e.init){let t=e.init(this.Reveal);t&&"function"==typeof t.then?t.then(n):n();}else n();},s();}}))}loadAsync(){return this.state="loaded",this.asyncDependencies.length&&this.asyncDependencies.forEach((e=>{H(e.src,e.callback);})),Promise.resolve()}registerPlugin(e){2===arguments.length&&"string"==typeof arguments[0]?(e=arguments[1]).id=arguments[0]:"function"==typeof e&&(e=e());let t=e.id;"string"!=typeof t?console.warn("Unrecognized plugin format; can't find plugin.id",e):void 0===this.registeredPlugins[t]?(this.registeredPlugins[t]=e,"loaded"===this.state&&"function"==typeof e.init&&e.init(this.Reveal)):console.warn('reveal.js: "'+t+'" plugin has already been registered');}hasPlugin(e){return !!this.registeredPlugins[e]}getPlugin(e){return this.registeredPlugins[e]}getRegisteredPlugins(){return this.registeredPlugins}destroy(){Object.values(this.registeredPlugins).forEach((e=>{"function"==typeof e.destroy&&e.destroy();})),this.registeredPlugins={},this.asyncDependencies=[];}}let O$1 = class O{constructor(e){this.Reveal=e;}async setupPDF(){const e=this.Reveal.getConfig(),i=t$1(this.Reveal.getRevealElement(),S$1),s=e.slideNumber&&/all|print/i.test(e.showSlideNumber),n=this.Reveal.getComputedSlideSize(window.innerWidth,window.innerHeight),a=Math.floor(n.width*(1+e.margin)),o=Math.floor(n.height*(1+e.margin)),r=n.width,d=n.height;await new Promise(requestAnimationFrame),l$1("@page{size:"+a+"px "+o+"px; margin: 0px;}"),l$1(".reveal section>img, .reveal section>video, .reveal section>iframe{max-width: "+r+"px; max-height:"+d+"px}"),document.documentElement.classList.add("print-pdf"),document.body.style.width=a+"px",document.body.style.height=o+"px";const c=document.querySelector(".reveal-viewport");let h;if(c){const e=window.getComputedStyle(c);e&&e.background&&(h=e.background);}await new Promise(requestAnimationFrame),this.Reveal.layoutSlideContents(r,d),await new Promise(requestAnimationFrame);const u=i.map((e=>e.scrollHeight)),g=[],v=i[0].parentNode;let p=1;i.forEach((function(i,n){if(!1===i.classList.contains("stack")){let l=(a-r)/2,c=(o-d)/2;const v=u[n];let m=Math.max(Math.ceil(v/o),1);m=Math.min(m,e.pdfMaxPagesPerSlide),(1===m&&e.center||i.classList.contains("center"))&&(c=Math.max((o-v)/2,0));const f=document.createElement("div");if(g.push(f),f.className="pdf-page",f.style.height=(o+e.pdfPageHeightOffset)*m+"px",h&&(f.style.background=h),f.appendChild(i),i.style.left=l+"px",i.style.top=c+"px",i.style.width=r+"px",this.Reveal.slideContent.layout(i),i.slideBackgroundElement&&f.insertBefore(i.slideBackgroundElement,i),e.showNotes){const t=this.Reveal.getSlideNotes(i);if(t){const i=8,s="string"==typeof e.showNotes?e.showNotes:"inline",n=document.createElement("div");n.classList.add("speaker-notes"),n.classList.add("speaker-notes-pdf"),n.setAttribute("data-layout",s),n.innerHTML=t,"separate-page"===s?g.push(n):(n.style.left=i+"px",n.style.bottom=i+"px",n.style.width=a-2*i+"px",f.appendChild(n));}}if(s){const e=document.createElement("div");e.classList.add("slide-number"),e.classList.add("slide-number-pdf"),e.innerHTML=p++,f.appendChild(e);}if(e.pdfSeparateFragments){const e=this.Reveal.fragments.sort(f.querySelectorAll(".fragment"),!0);let t;e.forEach((function(e,i){t&&t.forEach((function(e){e.classList.remove("current-fragment");})),e.forEach((function(e){e.classList.add("visible","current-fragment");}),this);const n=f.cloneNode(!0);if(s){const e=i+1;n.querySelector(".slide-number-pdf").innerHTML+="."+e;}g.push(n),t=e;}),this),e.forEach((function(e){e.forEach((function(e){e.classList.remove("visible","current-fragment");}));}));}else t$1(f,".fragment:not(.fade-out)").forEach((function(e){e.classList.add("visible");}));}}),this),await new Promise(requestAnimationFrame),g.forEach((e=>v.appendChild(e))),this.Reveal.slideContent.layout(this.Reveal.getSlidesElement()),this.Reveal.dispatchEvent({type:"pdf-ready"});}isPrintingPDF(){return /print-pdf/gi.test(window.location.search)}};let q$1 = class q{constructor(e){this.Reveal=e,this.touchStartX=0,this.touchStartY=0,this.touchStartCount=0,this.touchCaptured=!1,this.onPointerDown=this.onPointerDown.bind(this),this.onPointerMove=this.onPointerMove.bind(this),this.onPointerUp=this.onPointerUp.bind(this),this.onTouchStart=this.onTouchStart.bind(this),this.onTouchMove=this.onTouchMove.bind(this),this.onTouchEnd=this.onTouchEnd.bind(this);}bind(){let e=this.Reveal.getRevealElement();"onpointerdown"in window?(e.addEventListener("pointerdown",this.onPointerDown,!1),e.addEventListener("pointermove",this.onPointerMove,!1),e.addEventListener("pointerup",this.onPointerUp,!1)):window.navigator.msPointerEnabled?(e.addEventListener("MSPointerDown",this.onPointerDown,!1),e.addEventListener("MSPointerMove",this.onPointerMove,!1),e.addEventListener("MSPointerUp",this.onPointerUp,!1)):(e.addEventListener("touchstart",this.onTouchStart,!1),e.addEventListener("touchmove",this.onTouchMove,!1),e.addEventListener("touchend",this.onTouchEnd,!1));}unbind(){let e=this.Reveal.getRevealElement();e.removeEventListener("pointerdown",this.onPointerDown,!1),e.removeEventListener("pointermove",this.onPointerMove,!1),e.removeEventListener("pointerup",this.onPointerUp,!1),e.removeEventListener("MSPointerDown",this.onPointerDown,!1),e.removeEventListener("MSPointerMove",this.onPointerMove,!1),e.removeEventListener("MSPointerUp",this.onPointerUp,!1),e.removeEventListener("touchstart",this.onTouchStart,!1),e.removeEventListener("touchmove",this.onTouchMove,!1),e.removeEventListener("touchend",this.onTouchEnd,!1);}isSwipePrevented(e){if(a$1(e,"video, audio"))return !0;for(;e&&"function"==typeof e.hasAttribute;){if(e.hasAttribute("data-prevent-swipe"))return !0;e=e.parentNode;}return !1}onTouchStart(e){if(this.isSwipePrevented(e.target))return !0;this.touchStartX=e.touches[0].clientX,this.touchStartY=e.touches[0].clientY,this.touchStartCount=e.touches.length;}onTouchMove(e){if(this.isSwipePrevented(e.target))return !0;let t=this.Reveal.getConfig();if(this.touchCaptured)v$1&&e.preventDefault();else {this.Reveal.onUserInput(e);let i=e.touches[0].clientX,s=e.touches[0].clientY;if(1===e.touches.length&&2!==this.touchStartCount){let n=this.Reveal.availableRoutes({includeFragments:!0}),a=i-this.touchStartX,o=s-this.touchStartY;a>40&&Math.abs(a)>Math.abs(o)?(this.touchCaptured=!0,"linear"===t.navigationMode?t.rtl?this.Reveal.next():this.Reveal.prev():this.Reveal.left()):a<-40&&Math.abs(a)>Math.abs(o)?(this.touchCaptured=!0,"linear"===t.navigationMode?t.rtl?this.Reveal.prev():this.Reveal.next():this.Reveal.right()):o>40&&n.up?(this.touchCaptured=!0,"linear"===t.navigationMode?this.Reveal.prev():this.Reveal.up()):o<-40&&n.down&&(this.touchCaptured=!0,"linear"===t.navigationMode?this.Reveal.next():this.Reveal.down()),t.embedded?(this.touchCaptured||this.Reveal.isVerticalSlide())&&e.preventDefault():e.preventDefault();}}}onTouchEnd(e){this.touchCaptured=!1;}onPointerDown(e){e.pointerType!==e.MSPOINTER_TYPE_TOUCH&&"touch"!==e.pointerType||(e.touches=[{clientX:e.clientX,clientY:e.clientY}],this.onTouchStart(e));}onPointerMove(e){e.pointerType!==e.MSPOINTER_TYPE_TOUCH&&"touch"!==e.pointerType||(e.touches=[{clientX:e.clientX,clientY:e.clientY}],this.onTouchMove(e));}onPointerUp(e){e.pointerType!==e.MSPOINTER_TYPE_TOUCH&&"touch"!==e.pointerType||(e.touches=[{clientX:e.clientX,clientY:e.clientY}],this.onTouchEnd(e));}};const U="focus",j$1="blur";class W{constructor(e){this.Reveal=e,this.onRevealPointerDown=this.onRevealPointerDown.bind(this),this.onDocumentPointerDown=this.onDocumentPointerDown.bind(this);}configure(e,t){e.embedded?this.blur():(this.focus(),this.unbind());}bind(){this.Reveal.getConfig().embedded&&this.Reveal.getRevealElement().addEventListener("pointerdown",this.onRevealPointerDown,!1);}unbind(){this.Reveal.getRevealElement().removeEventListener("pointerdown",this.onRevealPointerDown,!1),document.removeEventListener("pointerdown",this.onDocumentPointerDown,!1);}focus(){this.state!==U&&(this.Reveal.getRevealElement().classList.add("focused"),document.addEventListener("pointerdown",this.onDocumentPointerDown,!1)),this.state=U;}blur(){this.state!==j$1&&(this.Reveal.getRevealElement().classList.remove("focused"),document.removeEventListener("pointerdown",this.onDocumentPointerDown,!1)),this.state=j$1;}isFocused(){return this.state===U}destroy(){this.Reveal.getRevealElement().classList.remove("focused");}onRevealPointerDown(e){this.focus();}onDocumentPointerDown(e){let t=o$1(e.target,".reveal");t&&t===this.Reveal.getRevealElement()||this.blur();}}class K{constructor(e){this.Reveal=e;}render(){this.element=document.createElement("div"),this.element.className="speaker-notes",this.element.setAttribute("data-prevent-swipe",""),this.element.setAttribute("tabindex","0"),this.Reveal.getRevealElement().appendChild(this.element);}configure(e,t){e.showNotes&&this.element.setAttribute("data-layout","string"==typeof e.showNotes?e.showNotes:"inline");}update(){this.Reveal.getConfig().showNotes&&this.element&&this.Reveal.getCurrentSlide()&&!this.Reveal.print.isPrintingPDF()&&(this.element.innerHTML=this.getSlideNotes()||'<span class="notes-placeholder">No notes on this slide.</span>');}updateVisibility(){this.Reveal.getConfig().showNotes&&this.hasNotes()&&!this.Reveal.print.isPrintingPDF()?this.Reveal.getRevealElement().classList.add("show-notes"):this.Reveal.getRevealElement().classList.remove("show-notes");}hasNotes(){return this.Reveal.getSlidesElement().querySelectorAll("[data-notes], aside.notes").length>0}isSpeakerNotesWindow(){return !!window.location.search.match(/receiver/gi)}getSlideNotes(e=this.Reveal.getCurrentSlide()){if(e.hasAttribute("data-notes"))return e.getAttribute("data-notes");let t=e.querySelectorAll("aside.notes");return t?Array.from(t).map((e=>e.innerHTML)).join("\n"):null}destroy(){this.element.remove();}}class V{constructor(e,t){this.diameter=100,this.diameter2=this.diameter/2,this.thickness=6,this.playing=!1,this.progress=0,this.progressOffset=1,this.container=e,this.progressCheck=t,this.canvas=document.createElement("canvas"),this.canvas.className="playback",this.canvas.width=this.diameter,this.canvas.height=this.diameter,this.canvas.style.width=this.diameter2+"px",this.canvas.style.height=this.diameter2+"px",this.context=this.canvas.getContext("2d"),this.container.appendChild(this.canvas),this.render();}setPlaying(e){const t=this.playing;this.playing=e,!t&&this.playing?this.animate():this.render();}animate(){const e=this.progress;this.progress=this.progressCheck(),e>.8&&this.progress<.2&&(this.progressOffset=this.progress),this.render(),this.playing&&requestAnimationFrame(this.animate.bind(this));}render(){let e=this.playing?this.progress:0,t=this.diameter2-this.thickness,i=this.diameter2,s=this.diameter2,n=28;this.progressOffset+=.1*(1-this.progressOffset);const a=-Math.PI/2+e*(2*Math.PI),o=-Math.PI/2+this.progressOffset*(2*Math.PI);this.context.save(),this.context.clearRect(0,0,this.diameter,this.diameter),this.context.beginPath(),this.context.arc(i,s,t+4,0,2*Math.PI,!1),this.context.fillStyle="rgba( 0, 0, 0, 0.4 )",this.context.fill(),this.context.beginPath(),this.context.arc(i,s,t,0,2*Math.PI,!1),this.context.lineWidth=this.thickness,this.context.strokeStyle="rgba( 255, 255, 255, 0.2 )",this.context.stroke(),this.playing&&(this.context.beginPath(),this.context.arc(i,s,t,o,a,!1),this.context.lineWidth=this.thickness,this.context.strokeStyle="#fff",this.context.stroke()),this.context.translate(i-14,s-14),this.playing?(this.context.fillStyle="#fff",this.context.fillRect(0,0,10,n),this.context.fillRect(18,0,10,n)):(this.context.beginPath(),this.context.translate(4,0),this.context.moveTo(0,0),this.context.lineTo(24,14),this.context.lineTo(0,n),this.context.fillStyle="#fff",this.context.fill()),this.context.restore();}on(e,t){this.canvas.addEventListener(e,t,!1);}off(e,t){this.canvas.removeEventListener(e,t,!1);}destroy(){this.playing=!1,this.canvas.parentNode&&this.container.removeChild(this.canvas);}}var $={width:960,height:700,margin:.04,minScale:.2,maxScale:2,controls:!0,controlsTutorial:!0,controlsLayout:"bottom-right",controlsBackArrows:"faded",progress:!0,slideNumber:!1,showSlideNumber:"all",hashOneBasedIndex:!1,hash:!1,respondToHashChanges:!0,jumpToSlide:!0,history:!1,keyboard:!0,keyboardCondition:null,disableLayout:!1,overview:!0,center:!0,touch:!0,loop:!1,rtl:!1,navigationMode:"default",shuffle:!1,fragments:!0,fragmentInURL:!0,embedded:!1,help:!0,pause:!0,showNotes:!1,showHiddenSlides:!1,autoPlayMedia:null,preloadIframes:null,autoAnimate:!0,autoAnimateMatcher:null,autoAnimateEasing:"ease",autoAnimateDuration:1,autoAnimateUnmatched:!0,autoAnimateStyles:["opacity","color","background-color","padding","font-size","line-height","letter-spacing","border-width","border-color","border-radius","outline","outline-offset"],autoSlide:0,autoSlideStoppable:!0,autoSlideMethod:null,defaultTiming:null,mouseWheel:!1,previewLinks:!1,postMessage:!0,postMessageEvents:!1,focusBodyOnPageVisibilityChange:!0,transition:"slide",transitionSpeed:"default",backgroundTransition:"fade",parallaxBackgroundImage:"",parallaxBackgroundSize:"",parallaxBackgroundRepeat:"",parallaxBackgroundPosition:"",parallaxBackgroundHorizontal:null,parallaxBackgroundVertical:null,pdfMaxPagesPerSlide:Number.POSITIVE_INFINITY,pdfSeparateFragments:!0,pdfPageHeightOffset:-1,viewDistance:3,mobileViewDistance:2,display:"block",hideInactiveCursor:!0,hideCursorTime:5e3,sortFragmentsOnSync:!0,dependencies:[],plugins:[]};const X="4.6.0";function Y(a,l){arguments.length<2&&(l=arguments[0],a=document.querySelector(".reveal"));const h={};let u,v,p,m,f,E={},C=!1,x={hasNavigatedHorizontally:!1,hasNavigatedVertically:!1},H=[],U=1,j={layout:"",overview:""},Y={},_="idle",J=0,G=0,Q=-1,Z=!1,ee=new b$1(h),te=new y$1(h),ie=new w$1(h),se=new P$1(h),ne=new R(h),ae=new N$1(h),oe=new M$1(h),re=new I(h),le=new D(h),de=new T$1(h),ce=new F(h),he=new z(h),ue=new B(h),ge=new O$1(h),ve=new W(h),pe=new q$1(h),me=new K(h);function fe(e){if(!a)throw 'Unable to find presentation root (<div class="reveal">).';if(Y.wrapper=a,Y.slides=a.querySelector(".slides"),!Y.slides)throw 'Unable to find slides container (<div class="slides">).';return E={...$,...E,...l,...e,...d$1()},be(),window.addEventListener("load",We,!1),ue.load(E.plugins,E.dependencies).then(ye),new Promise((e=>h.on("ready",e)))}function be(){!0===E.embedded?Y.viewport=o$1(a,".reveal-viewport")||a:(Y.viewport=document.body,document.documentElement.classList.add("reveal-full-page")),Y.viewport.classList.add("reveal-viewport");}function ye(){C=!0,we(),Ee(),Ce(),ke(),Le(),lt(),xe(),le.readURL(),ne.update(!0),setTimeout((()=>{Y.slides.classList.remove("no-transition"),Y.wrapper.classList.add("ready"),Fe({type:"ready",data:{indexh:u,indexv:v,currentSlide:m}});}),1),ge.isPrintingPDF()&&(Ne(),"complete"===document.readyState?ge.setupPDF():window.addEventListener("load",(()=>{ge.setupPDF();})));}function we(){E.showHiddenSlides||t$1(Y.wrapper,'section[data-visibility="hidden"]').forEach((e=>{e.parentNode.removeChild(e);}));}function Ee(){Y.slides.classList.add("no-transition"),g$1?Y.wrapper.classList.add("no-hover"):Y.wrapper.classList.remove("no-hover"),ne.render(),te.render(),ie.render(),de.render(),ce.render(),me.render(),Y.pauseOverlay=r$1(Y.wrapper,"div","pause-overlay",E.controls?'<button class="resume-button">Resume presentation</button>':null),Y.statusElement=Re(),Y.wrapper.setAttribute("role","application");}function Re(){let e=Y.wrapper.querySelector(".aria-status");return e||(e=document.createElement("div"),e.style.position="absolute",e.style.height="1px",e.style.width="1px",e.style.overflow="hidden",e.style.clip="rect( 1px, 1px, 1px, 1px )",e.classList.add("aria-status"),e.setAttribute("aria-live","polite"),e.setAttribute("aria-atomic","true"),Y.wrapper.appendChild(e)),e}function Se(e){Y.statusElement.textContent=e;}function Ae(e){let t="";if(3===e.nodeType)t+=e.textContent;else if(1===e.nodeType){let i=e.getAttribute("aria-hidden"),s="none"===window.getComputedStyle(e).display;"true"===i||s||Array.from(e.childNodes).forEach((e=>{t+=Ae(e);}));}return t=t.trim(),""===t?"":t+" "}function ke(){setInterval((()=>{0===Y.wrapper.scrollTop&&0===Y.wrapper.scrollLeft||(Y.wrapper.scrollTop=0,Y.wrapper.scrollLeft=0);}),1e3);}function Le(){document.addEventListener("fullscreenchange",$t),document.addEventListener("webkitfullscreenchange",$t);}function Ce(){E.postMessage&&window.addEventListener("message",Ut,!1);}function xe(t){const s={...E};if("object"==typeof t&&e$1(E,t),!1===h.isReady())return;const n=Y.wrapper.querySelectorAll(S$1).length;Y.wrapper.classList.remove(s.transition),Y.wrapper.classList.add(E.transition),Y.wrapper.setAttribute("data-transition-speed",E.transitionSpeed),Y.wrapper.setAttribute("data-background-transition",E.backgroundTransition),Y.viewport.style.setProperty("--slide-width",E.width+"px"),Y.viewport.style.setProperty("--slide-height",E.height+"px"),E.shuffle&&dt(),i$1(Y.wrapper,"embedded",E.embedded),i$1(Y.wrapper,"rtl",E.rtl),i$1(Y.wrapper,"center",E.center),!1===E.pause&&Ze(),E.previewLinks?(He(),Be("[data-preview-link=false]")):(Be(),He("[data-preview-link]:not([data-preview-link=false])")),se.reset(),f&&(f.destroy(),f=null),n>1&&E.autoSlide&&E.autoSlideStoppable&&(f=new V(Y.wrapper,(()=>Math.min(Math.max((Date.now()-Q)/J,0),1))),f.on("click",Yt),Z=!1),"default"!==E.navigationMode?Y.wrapper.setAttribute("data-navigation-mode",E.navigationMode):Y.wrapper.removeAttribute("data-navigation-mode"),me.configure(E,s),ve.configure(E,s),he.configure(E,s),de.configure(E,s),ce.configure(E,s),re.configure(E,s),ae.configure(E,s),te.configure(E,s),ot();}function Pe(){window.addEventListener("resize",Kt,!1),E.touch&&pe.bind(),E.keyboard&&re.bind(),E.progress&&ce.bind(),E.respondToHashChanges&&le.bind(),de.bind(),ve.bind(),Y.slides.addEventListener("click",Wt,!1),Y.slides.addEventListener("transitionend",jt,!1),Y.pauseOverlay.addEventListener("click",Ze,!1),E.focusBodyOnPageVisibilityChange&&document.addEventListener("visibilitychange",Vt,!1);}function Ne(){pe.unbind(),ve.unbind(),re.unbind(),de.unbind(),ce.unbind(),le.unbind(),window.removeEventListener("resize",Kt,!1),Y.slides.removeEventListener("click",Wt,!1),Y.slides.removeEventListener("transitionend",jt,!1),Y.pauseOverlay.removeEventListener("click",Ze,!1);}function Me(){Ne(),Mt(),Be(),me.destroy(),ve.destroy(),ue.destroy(),he.destroy(),de.destroy(),ce.destroy(),ne.destroy(),te.destroy(),ie.destroy(),document.removeEventListener("fullscreenchange",$t),document.removeEventListener("webkitfullscreenchange",$t),document.removeEventListener("visibilitychange",Vt,!1),window.removeEventListener("message",Ut,!1),window.removeEventListener("load",We,!1),Y.pauseOverlay&&Y.pauseOverlay.remove(),Y.statusElement&&Y.statusElement.remove(),document.documentElement.classList.remove("reveal-full-page"),Y.wrapper.classList.remove("ready","center","has-horizontal-slides","has-vertical-slides"),Y.wrapper.removeAttribute("data-transition-speed"),Y.wrapper.removeAttribute("data-background-transition"),Y.viewport.classList.remove("reveal-viewport"),Y.viewport.style.removeProperty("--slide-width"),Y.viewport.style.removeProperty("--slide-height"),Y.slides.style.removeProperty("width"),Y.slides.style.removeProperty("height"),Y.slides.style.removeProperty("zoom"),Y.slides.style.removeProperty("left"),Y.slides.style.removeProperty("top"),Y.slides.style.removeProperty("bottom"),Y.slides.style.removeProperty("right"),Y.slides.style.removeProperty("transform"),Array.from(Y.wrapper.querySelectorAll(S$1)).forEach((e=>{e.style.removeProperty("display"),e.style.removeProperty("top"),e.removeAttribute("hidden"),e.removeAttribute("aria-hidden");}));}function Ie(e,t,i){a.addEventListener(e,t,i);}function De(e,t,i){a.removeEventListener(e,t,i);}function Te(e){"string"==typeof e.layout&&(j.layout=e.layout),"string"==typeof e.overview&&(j.overview=e.overview),j.layout?n$1(Y.slides,j.layout+" "+j.overview):n$1(Y.slides,j.overview);}function Fe({target:t=Y.wrapper,type:i,data:s,bubbles:n=!0}){let a=document.createEvent("HTMLEvents",1,2);return a.initEvent(i,n,!0),e$1(a,s),t.dispatchEvent(a),t===Y.wrapper&&ze(i),a}function ze(t,i){if(E.postMessageEvents&&window.parent!==window.self){let s={namespace:"reveal",eventName:t,state:xt()};e$1(s,i),window.parent.postMessage(JSON.stringify(s),"*");}}function He(e="a"){Array.from(Y.wrapper.querySelectorAll(e)).forEach((e=>{/^(http|www)/gi.test(e.getAttribute("href"))&&e.addEventListener("click",Xt,!1);}));}function Be(e="a"){Array.from(Y.wrapper.querySelectorAll(e)).forEach((e=>{/^(http|www)/gi.test(e.getAttribute("href"))&&e.removeEventListener("click",Xt,!1);}));}function Oe(e){je(),Y.overlay=document.createElement("div"),Y.overlay.classList.add("overlay"),Y.overlay.classList.add("overlay-preview"),Y.wrapper.appendChild(Y.overlay),Y.overlay.innerHTML=`<header>\n\t\t\t\t<a class="close" href="#"><span class="icon"></span></a>\n\t\t\t\t<a class="external" href="${e}" target="_blank"><span class="icon"></span></a>\n\t\t\t</header>\n\t\t\t<div class="spinner"></div>\n\t\t\t<div class="viewport">\n\t\t\t\t<iframe src="${e}"></iframe>\n\t\t\t\t<small class="viewport-inner">\n\t\t\t\t\t<span class="x-frame-error">Unable to load iframe. This is likely due to the site's policy (x-frame-options).</span>\n\t\t\t\t</small>\n\t\t\t</div>`,Y.overlay.querySelector("iframe").addEventListener("load",(e=>{Y.overlay.classList.add("loaded");}),!1),Y.overlay.querySelector(".close").addEventListener("click",(e=>{je(),e.preventDefault();}),!1),Y.overlay.querySelector(".external").addEventListener("click",(e=>{je();}),!1);}function qe(e){"boolean"==typeof e?e?Ue():je():Y.overlay?je():Ue();}function Ue(){if(E.help){je(),Y.overlay=document.createElement("div"),Y.overlay.classList.add("overlay"),Y.overlay.classList.add("overlay-help"),Y.wrapper.appendChild(Y.overlay);let e='<p class="title">Keyboard Shortcuts</p><br/>',t=re.getShortcuts(),i=re.getBindings();e+="<table><th>KEY</th><th>ACTION</th>";for(let i in t)e+=`<tr><td>${i}</td><td>${t[i]}</td></tr>`;for(let t in i)i[t].key&&i[t].description&&(e+=`<tr><td>${i[t].key}</td><td>${i[t].description}</td></tr>`);e+="</table>",Y.overlay.innerHTML=`\n\t\t\t\t<header>\n\t\t\t\t\t<a class="close" href="#"><span class="icon"></span></a>\n\t\t\t\t</header>\n\t\t\t\t<div class="viewport">\n\t\t\t\t\t<div class="viewport-inner">${e}</div>\n\t\t\t\t</div>\n\t\t\t`,Y.overlay.querySelector(".close").addEventListener("click",(e=>{je(),e.preventDefault();}),!1);}}function je(){return !!Y.overlay&&(Y.overlay.parentNode.removeChild(Y.overlay),Y.overlay=null,!0)}function We(){if(Y.wrapper&&!ge.isPrintingPDF()){if(!E.disableLayout){g$1&&!E.embedded&&document.documentElement.style.setProperty("--vh",.01*window.innerHeight+"px");const e=Ve(),t=U;Ke(E.width,E.height),Y.slides.style.width=e.width+"px",Y.slides.style.height=e.height+"px",U=Math.min(e.presentationWidth/e.width,e.presentationHeight/e.height),U=Math.max(U,E.minScale),U=Math.min(U,E.maxScale),1===U?(Y.slides.style.zoom="",Y.slides.style.left="",Y.slides.style.top="",Y.slides.style.bottom="",Y.slides.style.right="",Te({layout:""})):(Y.slides.style.zoom="",Y.slides.style.left="50%",Y.slides.style.top="50%",Y.slides.style.bottom="auto",Y.slides.style.right="auto",Te({layout:"translate(-50%, -50%) scale("+U+")"}));const i=Array.from(Y.wrapper.querySelectorAll(S$1));for(let t=0,s=i.length;t<s;t++){const s=i[t];"none"!==s.style.display&&(E.center||s.classList.contains("center")?s.classList.contains("stack")?s.style.top=0:s.style.top=Math.max((e.height-s.scrollHeight)/2,0)+"px":s.style.top="");}t!==U&&Fe({type:"resize",data:{oldScale:t,scale:U,size:e}});}Y.viewport.style.setProperty("--slide-scale",U),ce.update(),ne.updateParallax(),oe.isActive()&&oe.update();}}function Ke(e,i){t$1(Y.slides,"section > .stretch, section > .r-stretch").forEach((t=>{let s=c$1(t,i);if(/(img|video)/gi.test(t.nodeName)){const i=t.naturalWidth||t.videoWidth,n=t.naturalHeight||t.videoHeight,a=Math.min(e/i,s/n);t.style.width=i*a+"px",t.style.height=n*a+"px";}else t.style.width=e+"px",t.style.height=s+"px";}));}function Ve(e,t){let i=E.width,s=E.height;E.disableLayout&&(i=Y.slides.offsetWidth,s=Y.slides.offsetHeight);const n={width:i,height:s,presentationWidth:e||Y.wrapper.offsetWidth,presentationHeight:t||Y.wrapper.offsetHeight};return n.presentationWidth-=n.presentationWidth*E.margin,n.presentationHeight-=n.presentationHeight*E.margin,"string"==typeof n.width&&/%$/.test(n.width)&&(n.width=parseInt(n.width,10)/100*n.presentationWidth),"string"==typeof n.height&&/%$/.test(n.height)&&(n.height=parseInt(n.height,10)/100*n.presentationHeight),n}function $e(e,t){"object"==typeof e&&"function"==typeof e.setAttribute&&e.setAttribute("data-previous-indexv",t||0);}function Xe(e){if("object"==typeof e&&"function"==typeof e.setAttribute&&e.classList.contains("stack")){const t=e.hasAttribute("data-start-indexv")?"data-start-indexv":"data-previous-indexv";return parseInt(e.getAttribute(t)||0,10)}return 0}function Ye(e=m){return e&&e.parentNode&&!!e.parentNode.nodeName.match(/section/i)}function _e(){return !(!m||!Ye(m))&&!m.nextElementSibling}function Je(){return 0===u&&0===v}function Ge(){return !!m&&(!m.nextElementSibling&&(!Ye(m)||!m.parentNode.nextElementSibling))}function Qe(){if(E.pause){const e=Y.wrapper.classList.contains("paused");Mt(),Y.wrapper.classList.add("paused"),!1===e&&Fe({type:"paused"});}}function Ze(){const e=Y.wrapper.classList.contains("paused");Y.wrapper.classList.remove("paused"),Nt(),e&&Fe({type:"resumed"});}function et(e){"boolean"==typeof e?e?Qe():Ze():tt()?Ze():Qe();}function tt(){return Y.wrapper.classList.contains("paused")}function it(e){"boolean"==typeof e?e?ie.show():ie.hide():ie.isVisible()?ie.hide():ie.show();}function st(e){"boolean"==typeof e?e?Dt():It():Z?Dt():It();}function nt(){return !(!J||Z)}function at(e,t,i,s){if(Fe({type:"beforeslidechange",data:{indexh:void 0===e?u:e,indexv:void 0===t?v:t,origin:s}}).defaultPrevented)return;p=m;const n=Y.wrapper.querySelectorAll(A$1);if(0===n.length)return;void 0!==t||oe.isActive()||(t=Xe(n[e])),p&&p.parentNode&&p.parentNode.classList.contains("stack")&&$e(p.parentNode,v);const a=H.concat();H.length=0;let o=u||0,r=v||0;u=ct(A$1,void 0===e?u:e),v=ct(k,void 0===t?v:t);let l=u!==o||v!==r;l||(p=null);let d=n[u],c=d.querySelectorAll("section");m=c[v]||d;let h=!1;l&&p&&m&&!oe.isActive()&&(p.hasAttribute("data-auto-animate")&&m.hasAttribute("data-auto-animate")&&p.getAttribute("data-auto-animate-id")===m.getAttribute("data-auto-animate-id")&&!(u>o||v>r?m:p).hasAttribute("data-auto-animate-restart")&&(h=!0,Y.slides.classList.add("disable-slide-transitions")),_="running"),gt(),We(),oe.isActive()&&oe.update(),void 0!==i&&ae.goto(i),p&&p!==m&&(p.classList.remove("present"),p.setAttribute("aria-hidden","true"),Je()&&setTimeout((()=>{Et().forEach((e=>{$e(e,0);}));}),0));e:for(let e=0,t=H.length;e<t;e++){for(let t=0;t<a.length;t++)if(a[t]===H[e]){a.splice(t,1);continue e}Y.viewport.classList.add(H[e]),Fe({type:H[e]});}for(;a.length;)Y.viewport.classList.remove(a.pop());l&&Fe({type:"slidechanged",data:{indexh:u,indexv:v,previousSlide:p,currentSlide:m,origin:s}}),!l&&p||(ee.stopEmbeddedContent(p),ee.startEmbeddedContent(m)),requestAnimationFrame((()=>{Se(Ae(m));})),ce.update(),de.update(),me.update(),ne.update(),ne.updateParallax(),te.update(),ae.update(),le.writeURL(),Nt(),h&&(setTimeout((()=>{Y.slides.classList.remove("disable-slide-transitions");}),0),E.autoAnimate&&se.run(p,m));}function ot(){Ne(),Pe(),We(),J=E.autoSlide,Nt(),ne.create(),le.writeURL(),!0===E.sortFragmentsOnSync&&ae.sortAll(),de.update(),ce.update(),gt(),me.update(),me.updateVisibility(),ne.update(!0),te.update(),ee.formatEmbeddedContent(),!1===E.autoPlayMedia?ee.stopEmbeddedContent(m,{unloadIframes:!1}):ee.startEmbeddedContent(m),oe.isActive()&&oe.layout();}function rt(e=m){ne.sync(e),ae.sync(e),ee.load(e),ne.update(),me.update();}function lt(){yt().forEach((e=>{t$1(e,"section").forEach(((e,t)=>{t>0&&(e.classList.remove("present"),e.classList.remove("past"),e.classList.add("future"),e.setAttribute("aria-hidden","true"));}));}));}function dt(e=yt()){e.forEach(((t,i)=>{let s=e[Math.floor(Math.random()*e.length)];s.parentNode===t.parentNode&&t.parentNode.insertBefore(t,s);let n=t.querySelectorAll("section");n.length&&dt(n);}));}function ct(e,i){let s=t$1(Y.wrapper,e),n=s.length,a=ge.isPrintingPDF(),o=!1,r=!1;if(n){E.loop&&(i>=n&&(o=!0),(i%=n)<0&&(i=n+i,r=!0)),i=Math.max(Math.min(i,n-1),0);for(let e=0;e<n;e++){let t=s[e],n=E.rtl&&!Ye(t);t.classList.remove("past"),t.classList.remove("present"),t.classList.remove("future"),t.setAttribute("hidden",""),t.setAttribute("aria-hidden","true"),t.querySelector("section")&&t.classList.add("stack"),a?t.classList.add("present"):e<i?(t.classList.add(n?"future":"past"),E.fragments&&ht(t)):e>i?(t.classList.add(n?"past":"future"),E.fragments&&ut(t)):e===i&&E.fragments&&(o?ut(t):r&&ht(t));}let e=s[i],t=e.classList.contains("present");e.classList.add("present"),e.removeAttribute("hidden"),e.removeAttribute("aria-hidden"),t||Fe({target:e,type:"visible",bubbles:!1});let l=e.getAttribute("data-state");l&&(H=H.concat(l.split(" ")));}else i=0;return i}function ht(e){t$1(e,".fragment").forEach((e=>{e.classList.add("visible"),e.classList.remove("current-fragment");}));}function ut(e){t$1(e,".fragment.visible").forEach((e=>{e.classList.remove("visible","current-fragment");}));}function gt(){let e,i,s=yt(),n=s.length;if(n&&void 0!==u){let a=oe.isActive()?10:E.viewDistance;g$1&&(a=oe.isActive()?6:E.mobileViewDistance),ge.isPrintingPDF()&&(a=Number.MAX_VALUE);for(let o=0;o<n;o++){let r=s[o],l=t$1(r,"section"),d=l.length;if(e=Math.abs((u||0)-o)||0,E.loop&&(e=Math.abs(((u||0)-o)%(n-a))||0),e<a?ee.load(r):ee.unload(r),d){let t=Xe(r);for(let s=0;s<d;s++){let n=l[s];i=o===(u||0)?Math.abs((v||0)-s):Math.abs(s-t),e+i<a?ee.load(n):ee.unload(n);}}}St()?Y.wrapper.classList.add("has-vertical-slides"):Y.wrapper.classList.remove("has-vertical-slides"),Rt()?Y.wrapper.classList.add("has-horizontal-slides"):Y.wrapper.classList.remove("has-horizontal-slides");}}function vt({includeFragments:e=!1}={}){let t=Y.wrapper.querySelectorAll(A$1),i=Y.wrapper.querySelectorAll(k),s={left:u>0,right:u<t.length-1,up:v>0,down:v<i.length-1};if(E.loop&&(t.length>1&&(s.left=!0,s.right=!0),i.length>1&&(s.up=!0,s.down=!0)),t.length>1&&"linear"===E.navigationMode&&(s.right=s.right||s.down,s.left=s.left||s.up),!0===e){let e=ae.availableRoutes();s.left=s.left||e.prev,s.up=s.up||e.prev,s.down=s.down||e.next,s.right=s.right||e.next;}if(E.rtl){let e=s.left;s.left=s.right,s.right=e;}return s}function pt(e=m){let t=yt(),i=0;e:for(let s=0;s<t.length;s++){let n=t[s],a=n.querySelectorAll("section");for(let t=0;t<a.length;t++){if(a[t]===e)break e;"uncounted"!==a[t].dataset.visibility&&i++;}if(n===e)break;!1===n.classList.contains("stack")&&"uncounted"!==n.dataset.visibility&&i++;}return i}function mt(){let e=kt(),t=pt();if(m){let e=m.querySelectorAll(".fragment");if(e.length>0){let i=.9;t+=m.querySelectorAll(".fragment.visible").length/e.length*i;}}return Math.min(t/(e-1),1)}function ft(e){let i,s=u,n=v;if(e){let i=Ye(e),a=i?e.parentNode:e,o=yt();s=Math.max(o.indexOf(a),0),n=void 0,i&&(n=Math.max(t$1(e.parentNode,"section").indexOf(e),0));}if(!e&&m){if(m.querySelectorAll(".fragment").length>0){let e=m.querySelector(".current-fragment");i=e&&e.hasAttribute("data-fragment-index")?parseInt(e.getAttribute("data-fragment-index"),10):m.querySelectorAll(".fragment.visible").length-1;}}return {h:s,v:n,f:i}}function bt(){return t$1(Y.wrapper,S$1+':not(.stack):not([data-visibility="uncounted"])')}function yt(){return t$1(Y.wrapper,A$1)}function wt(){return t$1(Y.wrapper,".slides>section>section")}function Et(){return t$1(Y.wrapper,A$1+".stack")}function Rt(){return yt().length>1}function St(){return wt().length>1}function At(){return bt().map((e=>{let t={};for(let i=0;i<e.attributes.length;i++){let s=e.attributes[i];t[s.name]=s.value;}return t}))}function kt(){return bt().length}function Lt(e,t){let i=yt()[e],s=i&&i.querySelectorAll("section");return s&&s.length&&"number"==typeof t?s?s[t]:void 0:i}function Ct(e,t){let i="number"==typeof e?Lt(e,t):e;if(i)return i.slideBackgroundElement}function xt(){let e=ft();return {indexh:e.h,indexv:e.v,indexf:e.f,paused:tt(),overview:oe.isActive()}}function Pt(e){if("object"==typeof e){at(s$1(e.indexh),s$1(e.indexv),s$1(e.indexf));let t=s$1(e.paused),i=s$1(e.overview);"boolean"==typeof t&&t!==tt()&&et(t),"boolean"==typeof i&&i!==oe.isActive()&&oe.toggle(i);}}function Nt(){if(Mt(),m&&!1!==E.autoSlide){let e=m.querySelector(".current-fragment[data-autoslide]"),i=e?e.getAttribute("data-autoslide"):null,s=m.parentNode?m.parentNode.getAttribute("data-autoslide"):null,n=m.getAttribute("data-autoslide");i?J=parseInt(i,10):n?J=parseInt(n,10):s?J=parseInt(s,10):(J=E.autoSlide,0===m.querySelectorAll(".fragment").length&&t$1(m,"video, audio").forEach((e=>{e.hasAttribute("data-autoplay")&&J&&1e3*e.duration/e.playbackRate>J&&(J=1e3*e.duration/e.playbackRate+1e3);}))),!J||Z||tt()||oe.isActive()||Ge()&&!ae.availableRoutes().next&&!0!==E.loop||(G=setTimeout((()=>{"function"==typeof E.autoSlideMethod?E.autoSlideMethod():Ot(),Nt();}),J),Q=Date.now()),f&&f.setPlaying(-1!==G);}}function Mt(){clearTimeout(G),G=-1;}function It(){J&&!Z&&(Z=!0,Fe({type:"autoslidepaused"}),clearTimeout(G),f&&f.setPlaying(!1));}function Dt(){J&&Z&&(Z=!1,Fe({type:"autoslideresumed"}),Nt());}function Tt({skipFragments:e=!1}={}){x.hasNavigatedHorizontally=!0,E.rtl?(oe.isActive()||e||!1===ae.next())&&vt().left&&at(u+1,"grid"===E.navigationMode?v:void 0):(oe.isActive()||e||!1===ae.prev())&&vt().left&&at(u-1,"grid"===E.navigationMode?v:void 0);}function Ft({skipFragments:e=!1}={}){x.hasNavigatedHorizontally=!0,E.rtl?(oe.isActive()||e||!1===ae.prev())&&vt().right&&at(u-1,"grid"===E.navigationMode?v:void 0):(oe.isActive()||e||!1===ae.next())&&vt().right&&at(u+1,"grid"===E.navigationMode?v:void 0);}function zt({skipFragments:e=!1}={}){(oe.isActive()||e||!1===ae.prev())&&vt().up&&at(u,v-1);}function Ht({skipFragments:e=!1}={}){x.hasNavigatedVertically=!0,(oe.isActive()||e||!1===ae.next())&&vt().down&&at(u,v+1);}function Bt({skipFragments:e=!1}={}){if(e||!1===ae.prev())if(vt().up)zt({skipFragments:e});else {let i;if(i=E.rtl?t$1(Y.wrapper,A$1+".future").pop():t$1(Y.wrapper,A$1+".past").pop(),i&&i.classList.contains("stack")){let e=i.querySelectorAll("section").length-1||void 0;at(u-1,e);}else Tt({skipFragments:e});}}function Ot({skipFragments:e=!1}={}){if(x.hasNavigatedHorizontally=!0,x.hasNavigatedVertically=!0,e||!1===ae.next()){let t=vt();t.down&&t.right&&E.loop&&_e()&&(t.down=!1),t.down?Ht({skipFragments:e}):E.rtl?Tt({skipFragments:e}):Ft({skipFragments:e});}}function qt(e){E.autoSlideStoppable&&It();}function Ut(e){let t=e.data;if("string"==typeof t&&"{"===t.charAt(0)&&"}"===t.charAt(t.length-1)&&(t=JSON.parse(t),t.method&&"function"==typeof h[t.method]))if(!1===L$1.test(t.method)){const e=h[t.method].apply(h,t.args);ze("callback",{method:t.method,result:e});}else console.warn('reveal.js: "'+t.method+'" is is blacklisted from the postMessage API');}function jt(e){"running"===_&&/section/gi.test(e.target.nodeName)&&(_="idle",Fe({type:"slidetransitionend",data:{indexh:u,indexv:v,previousSlide:p,currentSlide:m}}));}function Wt(e){const t=o$1(e.target,'a[href^="#"]');if(t){const i=t.getAttribute("href"),s=le.getIndicesFromHash(i);s&&(h.slide(s.h,s.v,s.f),e.preventDefault());}}function Kt(e){We();}function Vt(e){!1===document.hidden&&document.activeElement!==document.body&&("function"==typeof document.activeElement.blur&&document.activeElement.blur(),document.body.focus());}function $t(e){(document.fullscreenElement||document.webkitFullscreenElement)===Y.wrapper&&(e.stopImmediatePropagation(),setTimeout((()=>{h.layout(),h.focus.focus();}),1));}function Xt(e){if(e.currentTarget&&e.currentTarget.hasAttribute("href")){let t=e.currentTarget.getAttribute("href");t&&(Oe(t),e.preventDefault());}}function Yt(e){Ge()&&!1===E.loop?(at(0,0),Dt()):Z?Dt():It();}const _t={VERSION:X,initialize:fe,configure:xe,destroy:Me,sync:ot,syncSlide:rt,syncFragments:ae.sync.bind(ae),slide:at,left:Tt,right:Ft,up:zt,down:Ht,prev:Bt,next:Ot,navigateLeft:Tt,navigateRight:Ft,navigateUp:zt,navigateDown:Ht,navigatePrev:Bt,navigateNext:Ot,navigateFragment:ae.goto.bind(ae),prevFragment:ae.prev.bind(ae),nextFragment:ae.next.bind(ae),on:Ie,off:De,addEventListener:Ie,removeEventListener:De,layout:We,shuffle:dt,availableRoutes:vt,availableFragments:ae.availableRoutes.bind(ae),toggleHelp:qe,toggleOverview:oe.toggle.bind(oe),togglePause:et,toggleAutoSlide:st,toggleJumpToSlide:it,isFirstSlide:Je,isLastSlide:Ge,isLastVerticalSlide:_e,isVerticalSlide:Ye,isPaused:tt,isAutoSliding:nt,isSpeakerNotes:me.isSpeakerNotesWindow.bind(me),isOverview:oe.isActive.bind(oe),isFocused:ve.isFocused.bind(ve),isPrintingPDF:ge.isPrintingPDF.bind(ge),isReady:()=>C,loadSlide:ee.load.bind(ee),unloadSlide:ee.unload.bind(ee),startEmbeddedContent:()=>ee.startEmbeddedContent(m),stopEmbeddedContent:()=>ee.stopEmbeddedContent(m,{unloadIframes:!1}),showPreview:Oe,hidePreview:je,addEventListeners:Pe,removeEventListeners:Ne,dispatchEvent:Fe,getState:xt,setState:Pt,getProgress:mt,getIndices:ft,getSlidesAttributes:At,getSlidePastCount:pt,getTotalSlides:kt,getSlide:Lt,getPreviousSlide:()=>p,getCurrentSlide:()=>m,getSlideBackground:Ct,getSlideNotes:me.getSlideNotes.bind(me),getSlides:bt,getHorizontalSlides:yt,getVerticalSlides:wt,hasHorizontalSlides:Rt,hasVerticalSlides:St,hasNavigatedHorizontally:()=>x.hasNavigatedHorizontally,hasNavigatedVertically:()=>x.hasNavigatedVertically,addKeyBinding:re.addKeyBinding.bind(re),removeKeyBinding:re.removeKeyBinding.bind(re),triggerKey:re.triggerKey.bind(re),registerKeyboardShortcut:re.registerKeyboardShortcut.bind(re),getComputedSlideSize:Ve,getScale:()=>U,getConfig:()=>E,getQueryHash:d$1,getSlidePath:le.getHash.bind(le),getRevealElement:()=>a,getSlidesElement:()=>Y.slides,getViewportElement:()=>Y.viewport,getBackgroundsElement:()=>ne.element,registerPlugin:ue.registerPlugin.bind(ue),hasPlugin:ue.hasPlugin.bind(ue),getPlugin:ue.getPlugin.bind(ue),getPlugins:ue.getRegisteredPlugins.bind(ue)};return e$1(h,{..._t,announceStatus:Se,getStatusText:Ae,print:ge,focus:ve,progress:ce,controls:de,location:le,overview:oe,fragments:ae,slideContent:ee,slideNumber:te,onUserInput:qt,closeOverlay:je,updateSlidesVisibility:gt,layoutSlideContents:Ke,transformSlides:Te,cueAutoSlide:Nt,cancelAutoSlide:Mt}),_t}let _$1=Y,J=[];_$1.initialize=e=>(Object.assign(_$1,new Y(document.querySelector(".reveal"),e)),J.map((e=>e(_$1))),_$1.initialize()),["configure","on","off","addEventListener","removeEventListener","registerPlugin"].forEach((e=>{_$1[e]=(...t)=>{J.push((i=>i[e].call(null,...t)));};})),_$1.isReady=()=>!1,_$1.VERSION=X;

/*!
 * The reveal.js markdown plugin. Handles parsing of
 * markdown inside of presentations as well as loading
 * of external markdown documents.
 */


let marked;


await window.interpretate.shared.Marked.load();
marked = new window.interpretate.shared.Marked.default();



const DEFAULT_SLIDE_SEPARATOR = '\r?\n---\r?\n',
	  DEFAULT_VERTICAL_SEPARATOR = null,
	  DEFAULT_NOTES_SEPARATOR = '^\s*notes?:',
	  DEFAULT_ELEMENT_ATTRIBUTES_SEPARATOR = '\\\.element\\\s*?(.+?)$',
	  DEFAULT_SLIDE_ATTRIBUTES_SEPARATOR = '\\\.slide:\\\s*?(\\\S.+?)$';

const SCRIPT_END_PLACEHOLDER = '__SCRIPT_END__';

// match an optional line number offset and highlight line numbers
// [<line numbers>] or [<offset>: <line numbers>]
const CODE_LINE_NUMBER_REGEX = /\[\s*((\d*):)?\s*([\s\d,|-]*)\]/;

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

const Plugin = () => {

	// The reveal.js instance this plugin is attached to
	let deck;

	/**
	 * Retrieves the markdown contents of a slide section
	 * element. Normalizes leading tabs/whitespace.
	 */
	function getMarkdownFromSlide( section ) {

		// look for a <script> or <textarea data-template> wrapper
		const template = section.querySelector( '[data-template]' ) || section.querySelector( 'script' );

		// strip leading whitespace so it isn't evaluated as code
		let text = ( template || section ).textContent;

		// restore script end tags
		text = text.replace( new RegExp( SCRIPT_END_PLACEHOLDER, 'g' ), '</script>' );

		const leadingWs = text.match( /^\n?(\s*)/ )[1].length,
			leadingTabs = text.match( /^\n?(\t*)/ )[1].length;

		if( leadingTabs > 0 ) {
			text = text.replace( new RegExp('\\n?\\t{' + leadingTabs + '}(.*)','g'), function(m, p1) { return '\n' + p1 ; } );
		}
		else if( leadingWs > 1 ) {
			text = text.replace( new RegExp('\\n? {' + leadingWs + '}(.*)', 'g'), function(m, p1) { return '\n' + p1 ; } );
		}

		return text;

	}

	/**
	 * Given a markdown slide section element, this will
	 * return all arguments that aren't related to markdown
	 * parsing. Used to forward any other user-defined arguments
	 * to the output markdown slide.
	 */
	function getForwardedAttributes( section ) {

		const attributes = section.attributes;
		const result = [];

		for( let i = 0, len = attributes.length; i < len; i++ ) {
			const name = attributes[i].name,
				value = attributes[i].value;

			// disregard attributes that are used for markdown loading/parsing
			if( /data\-(markdown|separator|vertical|notes)/gi.test( name ) ) continue;

			if( value ) {
				result.push( name + '="' + value + '"' );
			}
			else {
				result.push( name );
			}
		}

		return result.join( ' ' );

	}

	/**
	 * Inspects the given options and fills out default
	 * values for what's not defined.
	 */
	function getSlidifyOptions( options ) {
		const markdownConfig = deck.getConfig().markdown;

		options = options || {};
		options.separator = options.separator || markdownConfig?.separator || DEFAULT_SLIDE_SEPARATOR;
		options.verticalSeparator = options.verticalSeparator || markdownConfig?.verticalSeparator || DEFAULT_VERTICAL_SEPARATOR;
		options.notesSeparator = options.notesSeparator || markdownConfig?.notesSeparator || DEFAULT_NOTES_SEPARATOR;
		options.attributes = options.attributes || '';

		return options;

	}

	/**
	 * Helper function for constructing a markdown slide.
	 */
	function createMarkdownSlide( content, options ) {

		options = getSlidifyOptions( options );

		const notesMatch = content.split( new RegExp( options.notesSeparator, 'mgi' ) );

		if( notesMatch.length === 2 ) {
			content = notesMatch[0] + '<aside class="notes">' + marked.parse(notesMatch[1].trim()) + '</aside>';
		}

		// prevent script end tags in the content from interfering
		// with parsing
		content = content.replace( /<\/script>/g, SCRIPT_END_PLACEHOLDER );

		return '<script type="text/template">' + content + '</script>';

	}

	/**
	 * Parses a data string into multiple slides based
	 * on the passed in separator arguments.
	 */
	function slidify( markdown, options ) {

		options = getSlidifyOptions( options );

		const separatorRegex = new RegExp( options.separator + ( options.verticalSeparator ? '|' + options.verticalSeparator : '' ), 'mg' ),
			horizontalSeparatorRegex = new RegExp( options.separator );

		let matches,
			lastIndex = 0,
			isHorizontal,
			wasHorizontal = true,
			content,
			sectionStack = [];

		// iterate until all blocks between separators are stacked up
		while( matches = separatorRegex.exec( markdown ) ) {

			// determine direction (horizontal by default)
			isHorizontal = horizontalSeparatorRegex.test( matches[0] );

			if( !isHorizontal && wasHorizontal ) {
				// create vertical stack
				sectionStack.push( [] );
			}

			// pluck slide content from markdown input
			content = markdown.substring( lastIndex, matches.index );

			if( isHorizontal && wasHorizontal ) {
				// add to horizontal stack
				sectionStack.push( content );
			}
			else {
				// add to vertical stack
				sectionStack[sectionStack.length-1].push( content );
			}

			lastIndex = separatorRegex.lastIndex;
			wasHorizontal = isHorizontal;
		}

		// add the remaining slide
		( wasHorizontal ? sectionStack : sectionStack[sectionStack.length-1] ).push( markdown.substring( lastIndex ) );

		let markdownSections = '';

		// flatten the hierarchical stack, and insert <section data-markdown> tags
		for( let i = 0, len = sectionStack.length; i < len; i++ ) {
			// vertical
			if( sectionStack[i] instanceof Array ) {
				markdownSections += '<section '+ options.attributes +'>';

				sectionStack[i].forEach( function( child ) {
					markdownSections += '<section data-markdown>' + createMarkdownSlide( child, options ) + '</section>';
				} );

				markdownSections += '</section>';
			}
			else {
				markdownSections += '<section '+ options.attributes +' data-markdown>' + createMarkdownSlide( sectionStack[i], options ) + '</section>';
			}
		}

		return markdownSections;

	}

	/**
	 * Parses any current data-markdown slides, splits
	 * multi-slide markdown into separate sections and
	 * handles loading of external markdown.
	 */
	function processSlides( scope ) {

		return new Promise( function( resolve ) {

			const externalPromises = [];

			[].slice.call( scope.querySelectorAll( 'section[data-markdown]:not([data-markdown-parsed])') ).forEach( function( section, i ) {

				if( section.getAttribute( 'data-markdown' ).length ) {

					externalPromises.push( loadExternalMarkdown( section ).then(

						// Finished loading external file
						function( xhr, url ) {
							section.outerHTML = slidify( xhr.responseText, {
								separator: section.getAttribute( 'data-separator' ),
								verticalSeparator: section.getAttribute( 'data-separator-vertical' ),
								notesSeparator: section.getAttribute( 'data-separator-notes' ),
								attributes: getForwardedAttributes( section )
							});
						},

						// Failed to load markdown
						function( xhr, url ) {
							section.outerHTML = '<section data-state="alert">' +
								'ERROR: The attempt to fetch ' + url + ' failed with HTTP status ' + xhr.status + '.' +
								'Check your browser\'s JavaScript console for more details.' +
								'<p>Remember that you need to serve the presentation HTML from a HTTP server.</p>' +
								'</section>';
						}

					) );

				}
				else {

					section.outerHTML = slidify( getMarkdownFromSlide( section ), {
						separator: section.getAttribute( 'data-separator' ),
						verticalSeparator: section.getAttribute( 'data-separator-vertical' ),
						notesSeparator: section.getAttribute( 'data-separator-notes' ),
						attributes: getForwardedAttributes( section )
					});

				}

			});

			Promise.all( externalPromises ).then( resolve );

		} );

	}

	function loadExternalMarkdown( section ) {

		return new Promise( function( resolve, reject ) {

			const xhr = new XMLHttpRequest(),
				url = section.getAttribute( 'data-markdown' );

			const datacharset = section.getAttribute( 'data-charset' );

			// see https://developer.mozilla.org/en-US/docs/Web/API/element.getAttribute#Notes
			if( datacharset !== null && datacharset !== '' ) {
				xhr.overrideMimeType( 'text/html; charset=' + datacharset );
			}

			xhr.onreadystatechange = function( section, xhr ) {
				if( xhr.readyState === 4 ) {
					// file protocol yields status code 0 (useful for local debug, mobile applications etc.)
					if ( ( xhr.status >= 200 && xhr.status < 300 ) || xhr.status === 0 ) {

						resolve( xhr, url );

					}
					else {

						reject( xhr, url );

					}
				}
			}.bind( this, section, xhr );

			xhr.open( 'GET', url, true );

			try {
				xhr.send();
			}
			catch ( e ) {
				console.warn( 'Failed to get the Markdown file ' + url + '. Make sure that the presentation and the file are served by a HTTP server and the file can be found there. ' + e );
				resolve( xhr, url );
			}

		} );

	}

	/**
	 * Check if a node value has the attributes pattern.
	 * If yes, extract it and add that value as one or several attributes
	 * to the target element.
	 *
	 * You need Cache Killer on Chrome to see the effect on any FOM transformation
	 * directly on refresh (F5)
	 * http://stackoverflow.com/questions/5690269/disabling-chrome-cache-for-website-development/7000899#answer-11786277
	 */
	function addAttributeInElement( node, elementTarget, separator ) {

		const markdownClassesInElementsRegex = new RegExp( separator, 'mg' );
		const markdownClassRegex = new RegExp( "([^\"= ]+?)=\"([^\"]+?)\"|(data-[^\"= ]+?)(?=[\" ])", 'mg' );
		let nodeValue = node.nodeValue;
		let matches,
			matchesClass;
		if( matches = markdownClassesInElementsRegex.exec( nodeValue ) ) {

			const classes = matches[1];
			nodeValue = nodeValue.substring( 0, matches.index ) + nodeValue.substring( markdownClassesInElementsRegex.lastIndex );
			node.nodeValue = nodeValue;
			while( matchesClass = markdownClassRegex.exec( classes ) ) {
				if( matchesClass[2] ) {
					elementTarget.setAttribute( matchesClass[1], matchesClass[2] );
				} else {
					elementTarget.setAttribute( matchesClass[3], "" );
				}
			}
			return true;
		}
		return false;
	}

	/**
	 * Add attributes to the parent element of a text node,
	 * or the element of an attribute node.
	 */
	function addAttributes( section, element, previousElement, separatorElementAttributes, separatorSectionAttributes ) {

		if ( element !== null && element.childNodes !== undefined && element.childNodes.length > 0 ) {
			let previousParentElement = element;
			for( let i = 0; i < element.childNodes.length; i++ ) {
				const childElement = element.childNodes[i];
				if ( i > 0 ) {
					let j = i - 1;
					while ( j >= 0 ) {
						const aPreviousChildElement = element.childNodes[j];
						if ( typeof aPreviousChildElement.setAttribute === 'function' && aPreviousChildElement.tagName !== "BR" ) {
							previousParentElement = aPreviousChildElement;
							break;
						}
						j = j - 1;
					}
				}
				let parentSection = section;
				if( childElement.nodeName ===  "section" ) {
					parentSection = childElement ;
					previousParentElement = childElement ;
				}
				if ( typeof childElement.setAttribute === 'function' || childElement.nodeType === Node.COMMENT_NODE ) {
					addAttributes( parentSection, childElement, previousParentElement, separatorElementAttributes, separatorSectionAttributes );
				}
			}
		}

		if ( element.nodeType === Node.COMMENT_NODE ) {
			if ( addAttributeInElement( element, previousElement, separatorElementAttributes ) === false ) {
				addAttributeInElement( element, section, separatorSectionAttributes );
			}
		}
	}

	/**
	 * Converts any current data-markdown slides in the
	 * DOM to HTML.
	 */
	function convertSlides() {

		const sections = deck.getRevealElement().querySelectorAll( '[data-markdown]:not([data-markdown-parsed])');

		[].slice.call( sections ).forEach( function( section ) {

			section.setAttribute( 'data-markdown-parsed', true );

			const notes = section.querySelector( 'aside.notes' );
			const markdown = getMarkdownFromSlide( section );

			section.innerHTML = marked.parse( markdown );
			addAttributes( 	section, section, null, section.getAttribute( 'data-element-attributes' ) ||
							section.parentNode.getAttribute( 'data-element-attributes' ) ||
							DEFAULT_ELEMENT_ATTRIBUTES_SEPARATOR,
							section.getAttribute( 'data-attributes' ) ||
							section.parentNode.getAttribute( 'data-attributes' ) ||
							DEFAULT_SLIDE_ATTRIBUTES_SEPARATOR);

			// If there were notes, we need to re-add them after
			// having overwritten the section's HTML
			if( notes ) {
				section.appendChild( notes );
			}

		} );

		return Promise.resolve();

	}

	function escapeForHTML( input ) {

	  return input.replace( /([&<>'"])/g, char => HTML_ESCAPE_MAP[char] );

	}

	return {
		id: 'markdown',

		/**
		 * Starts processing and converting Markdown within the
		 * current reveal.js deck.
		 */
		init: function( reveal ) {

			deck = reveal;

			let { renderer, animateLists, ...markedOptions } = deck.getConfig().markdown || {};

			if( !renderer ) {
				renderer = new marked.Renderer();

				renderer.code = ( code, language ) => {

					// Off by default
					let lineNumberOffset = '';
					let lineNumbers = '';

					// Users can opt in to show line numbers and highlight
					// specific lines.
					// ```javascript []        show line numbers
					// ```javascript [1,4-8]   highlights lines 1 and 4-8
					// optional line number offset:
					// ```javascript [25: 1,4-8]   start line numbering at 25,
					//                             highlights lines 1 (numbered as 25) and 4-8 (numbered as 28-32)
					if( CODE_LINE_NUMBER_REGEX.test( language ) ) {
						let lineNumberOffsetMatch =  language.match( CODE_LINE_NUMBER_REGEX )[2];
						if (lineNumberOffsetMatch){
							lineNumberOffset =  `data-ln-start-from="${lineNumberOffsetMatch.trim()}"`;
						}

						lineNumbers = language.match( CODE_LINE_NUMBER_REGEX )[3].trim();
						lineNumbers = `data-line-numbers="${lineNumbers}"`;
						language = language.replace( CODE_LINE_NUMBER_REGEX, '' ).trim();
					}

					// Escape before this gets injected into the DOM to
					// avoid having the HTML parser alter our code before
					// highlight.js is able to read it
					code = escapeForHTML( code );

					// return `<pre><code ${lineNumbers} class="${language}">${code}</code></pre>`;

					return `<pre><code ${lineNumbers} ${lineNumberOffset} class="${language}">${code}</code></pre>`;
				};
			}

			if( animateLists === true ) {
				renderer.listitem = text => `<li class="fragment">${text}</li>`;
			}

			marked.setOptions( {
				renderer,
				...markedOptions
			} );

			return processSlides( deck.getRevealElement() ).then( convertSlides );

		},

		// TODO: Do these belong in the API?
		processSlides: processSlides,
		convertSlides: convertSlides,
		slidify: slidify,
		marked: marked
	}

};

const RevealPointer = (function () {

  const KEYCODES = {q: 81};

  // Utility to clamp values
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  return function () {
    // ------ state ------
    let cfg = {};
    let enabled = false;
    let container = null;

    // Main dot and tail elements
    let dot = null;
    let tailEls = []; // array of HTMLDivElement
    let trail = [];   // [{x,y}] newest first

    // pointer position within the container's own (unscaled) coordinates
    const pos = { x: 0, y: 0, isVisible: false };

    // ------ config ------
    function loadConfig(api) {
      const p = (api.getConfig && api.getConfig().pointer) || {};
      cfg.key = (p.key ?? "q").toLowerCase();
      cfg.pointerSize = (typeof p.pointerSize === "number" ? p.pointerSize : 12);
      cfg.tailLength = clamp((typeof p.tailLength === "number" ? p.tailLength : 10), 0, 60);
      cfg.color = (typeof p.color === "string" ? p.color : "red");
      cfg.alwaysVisible = (typeof p.alwaysVisible === "boolean" ? p.alwaysVisible : false);
      cfg.opacity = (typeof p.opacity === "number" ? p.opacity : 0.8);
      cfg.keyCode = KEYCODES[cfg.key];
    }

    // ------ dom helpers ------
    function createDot() {
      if (dot) return;

      const d = document.createElement("div");
      d.className = "cursor-dot";
      Object.assign(d.style, {
        position: "absolute",
        top: "0",
        left: "0",
        transform: "translate(0, 0)",
        width: `${cfg.pointerSize}px`,
        height: `${cfg.pointerSize}px`,
        backgroundColor: cfg.color,
        borderRadius: "50%",
        pointerEvents: "none",
        opacity: "0",
        transition: "opacity 120ms linear",
        willChange: "transform",
      });

      container.appendChild(d);
      dot = d;
    }

    function createTail() {
      destroyTail(); // reset
      if (cfg.tailLength <= 0) return;

      for (let i = 0; i < cfg.tailLength; i++) {
        const seg = document.createElement("div");
        const sizeFactor = 1 - (i + 1) / (cfg.tailLength + 1); // smaller further away
        const segSize = Math.max(2, Math.round(cfg.pointerSize * (0.4 + 0.6 * sizeFactor)));

        Object.assign(seg.style, {
          position: "absolute",
          top: "0",
          left: "0",
          transform: "translate(0, 0)",
          width: `${segSize}px`,
          height: `${segSize}px`,
          backgroundColor: cfg.color,
          borderRadius: "50%",
          pointerEvents: "none",
          opacity: "0",
          transition: "opacity 120ms linear",
          willChange: "transform, opacity",
          // Subtle blur can look nice; comment out if undesired:
          // filter: "blur(0.2px)",
        });

        container.appendChild(seg);
        tailEls.push(seg);
      }
    }

    function destroyDot() {
      if (!dot) return;
      dot.remove();
      dot = null;
    }

    function destroyTail() {
      tailEls.forEach(el => el.remove());
      tailEls = [];
      trail = [];
    }

    // ------ rendering ------
    function render() {
      // Main dot
      if (dot) {
        dot.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
        dot.style.opacity = pos.isVisible ? String(cfg.opacity) : "0";
        dot.style.width = `${cfg.pointerSize}px`;
        dot.style.height = `${cfg.pointerSize}px`;
        dot.style.backgroundColor = cfg.color;
      }

      // Tail
      if (tailEls.length) {
        for (let i = 0; i < tailEls.length; i++) {
          const seg = tailEls[i];
          const p = trail[i];
          if (!p || !pos.isVisible) {
            seg.style.opacity = "0";
            continue;
          }

          // Fade and size gradient along the tail
          const t = (i + 1) / (tailEls.length + 1);
          const alpha = cfg.opacity * (1 - t); // farther -> more transparent
          const baseSize = Math.max(2, Math.round(cfg.pointerSize * (1 - 0.6 * t)));
          seg.style.width = `${baseSize}px`;
          seg.style.height = `${baseSize}px`;

          // Center each segment on its tracked point
          const sx = p.x - baseSize / 2;
          const sy = p.y - baseSize / 2;

          seg.style.transform = `translate(${sx}px, ${sy}px)`;
          seg.style.opacity = String(alpha);
          seg.style.backgroundColor = cfg.color;
        }
      }
    }

    // ------ events ------
    function onMove(ev) {
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const ow = container.offsetWidth || 1;
      const oh = container.offsetHeight || 1;
      const scaleX = rect.width / ow;
      rect.height / oh;
      const scale = scaleX || 1; // Reveal is uniform scale

      // Convert viewport coords -> container coords -> unscale to layout pixels
      const x = (ev.clientX - rect.left) / scale;
      const y = (ev.clientY - rect.top) / scale;

      // Center the dot on the pointer
      pos.x = x - cfg.pointerSize / 2;
      pos.y = y - cfg.pointerSize / 2;

      // Record trail head as the uncentered point (real pointer position in container coords)
      // Using uncentered keeps tail centered on the true cursor.
      const head = { x, y };
      trail.unshift(head);
      if (trail.length > cfg.tailLength) trail.length = cfg.tailLength;

      requestAnimationFrame(render);
    }

    function toggle() {
      enabled = !enabled;
      if (enabled) {
        createDot();
        createTail();
        container.addEventListener("mousemove", onMove);
        container.classList.add("no-cursor"); // scoped to container (not body)
        pos.isVisible = true;
        requestAnimationFrame(render);
      } else {
        container.removeEventListener("mousemove", onMove);
        container.classList.remove("no-cursor");
        pos.isVisible = false;
        requestAnimationFrame(render);
        // Clean up DOM when disabled
        destroyTail();
        destroyDot();
      }
    }

    // ------ public plugin API for Reveal ------
    return {
      id: "pointer",
      init(api) {
        loadConfig(api);
        container = api.getRevealElement();

        // Ensure container can position absolutely positioned children
        const cs = getComputedStyle(container);
        if (cs.position === "static") {
          container.style.position = "relative";
        }

        // Color updates (work even if dot/tail not yet created)
        api.on("pointerColorChange", ({ color }) => {
          cfg.color = color ?? cfg.color;
          if (dot) dot.style.backgroundColor = cfg.color;
          tailEls.forEach(el => (el.style.backgroundColor = cfg.color));
        });

        if (cfg.alwaysVisible) {
          enabled = true;
          createDot();
          createTail();
          pos.isVisible = true;
          container.addEventListener("mousemove", onMove);
          container.classList.add("no-cursor");
          requestAnimationFrame(render);
        } else {
          api.addKeyBinding({ keyCode: cfg.keyCode, key: cfg.key }, () => toggle());
        }
      },
    };
  };
})();

// http://geoexamples.com/path-properties/ v1.2.0 Copyright 2023 Roger Veciana i Rovira
function t(t,n){for(var e=0;e<n.length;e++){var i=n[e];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,h(i.key),i);}}function n(n,e,i){return e&&t(n.prototype,e),i&&t(n,i),Object.defineProperty(n,"prototype",{writable:!1}),n}function e(t,n,e){return (n=h(n))in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e,t}function i(t){return function(t){if(Array.isArray(t))return r(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,n){if(!t)return;if("string"==typeof t)return r(t,n);var e=Object.prototype.toString.call(t).slice(8,-1);"Object"===e&&t.constructor&&(e=t.constructor.name);if("Map"===e||"Set"===e)return Array.from(t);if("Arguments"===e||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e))return r(t,n)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function r(t,n){(null==n||n>t.length)&&(n=t.length);for(var e=0,i=new Array(n);e<n;e++)i[e]=t[e];return i}function h(t){var n=function(t,n){if("object"!=typeof t||null===t)return t;var e=t[Symbol.toPrimitive];if(void 0!==e){var i=e.call(t,n||"default");if("object"!=typeof i)return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return ("string"===n?String:Number)(t)}(t,"string");return "symbol"==typeof n?n:String(n)}var a={a:7,c:6,h:1,l:2,m:2,q:4,s:4,t:2,v:1,z:0},s=/([astvzqmhlc])([^astvzqmhlc]*)/gi,o=/-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/gi,g=function(t){var n=t.match(o);return n?n.map(Number):[]},u=n((function(t,n,i,r){var h=this;e(this,"x0",void 0),e(this,"x1",void 0),e(this,"y0",void 0),e(this,"y1",void 0),e(this,"getTotalLength",(function(){return Math.sqrt(Math.pow(h.x0-h.x1,2)+Math.pow(h.y0-h.y1,2))})),e(this,"getPointAtLength",(function(t){var n=t/Math.sqrt(Math.pow(h.x0-h.x1,2)+Math.pow(h.y0-h.y1,2));n=Number.isNaN(n)?1:n;var e=(h.x1-h.x0)*n,i=(h.y1-h.y0)*n;return {x:h.x0+e,y:h.y0+i}})),e(this,"getTangentAtLength",(function(t){var n=Math.sqrt((h.x1-h.x0)*(h.x1-h.x0)+(h.y1-h.y0)*(h.y1-h.y0));return {x:(h.x1-h.x0)/n,y:(h.y1-h.y0)/n}})),e(this,"getPropertiesAtLength",(function(t){var n=h.getPointAtLength(t),e=h.getTangentAtLength(t);return {x:n.x,y:n.y,tangentX:e.x,tangentY:e.y}})),this.x0=t,this.x1=n,this.y0=i,this.y1=r;})),l=n((function(t,n,i,r,h,a,s,o,g){var u=this;e(this,"x0",void 0),e(this,"y0",void 0),e(this,"rx",void 0),e(this,"ry",void 0),e(this,"xAxisRotate",void 0),e(this,"LargeArcFlag",void 0),e(this,"SweepFlag",void 0),e(this,"x1",void 0),e(this,"y1",void 0),e(this,"length",void 0),e(this,"getTotalLength",(function(){return u.length})),e(this,"getPointAtLength",(function(t){t<0?t=0:t>u.length&&(t=u.length);var n=c({x:u.x0,y:u.y0},u.rx,u.ry,u.xAxisRotate,u.LargeArcFlag,u.SweepFlag,{x:u.x1,y:u.y1},t/u.length);return {x:n.x,y:n.y}})),e(this,"getTangentAtLength",(function(t){t<0?t=0:t>u.length&&(t=u.length);var n,e=.05,i=u.getPointAtLength(t);t<0?t=0:t>u.length&&(t=u.length);var r=(n=t<u.length-e?u.getPointAtLength(t+e):u.getPointAtLength(t-e)).x-i.x,h=n.y-i.y,a=Math.sqrt(r*r+h*h);return t<u.length-e?{x:-r/a,y:-h/a}:{x:r/a,y:h/a}})),e(this,"getPropertiesAtLength",(function(t){var n=u.getTangentAtLength(t),e=u.getPointAtLength(t);return {x:e.x,y:e.y,tangentX:n.x,tangentY:n.y}})),this.x0=t,this.y0=n,this.rx=i,this.ry=r,this.xAxisRotate=h,this.LargeArcFlag=a,this.SweepFlag=s,this.x1=o,this.y1=g;var l=f(300,(function(e){return c({x:t,y:n},i,r,h,a,s,{x:o,y:g},e)}));this.length=l.arcLength;})),c=function(t,n,e,i,r,h,a,s){n=Math.abs(n),e=Math.abs(e),i=y(i,360);var o=p(i);if(t.x===a.x&&t.y===a.y)return {x:t.x,y:t.y,ellipticalArcAngle:0};if(0===n||0===e)return {x:0,y:0,ellipticalArcAngle:0};var g=(t.x-a.x)/2,u=(t.y-a.y)/2,l={x:Math.cos(o)*g+Math.sin(o)*u,y:-Math.sin(o)*g+Math.cos(o)*u},c=Math.pow(l.x,2)/Math.pow(n,2)+Math.pow(l.y,2)/Math.pow(e,2);c>1&&(n=Math.sqrt(c)*n,e=Math.sqrt(c)*e);var f=(Math.pow(n,2)*Math.pow(e,2)-Math.pow(n,2)*Math.pow(l.y,2)-Math.pow(e,2)*Math.pow(l.x,2))/(Math.pow(n,2)*Math.pow(l.y,2)+Math.pow(e,2)*Math.pow(l.x,2));f=f<0?0:f;var x=(r!==h?1:-1)*Math.sqrt(f),v=x*(n*l.y/e),w=x*(-e*l.x/n),L={x:Math.cos(o)*v-Math.sin(o)*w+(t.x+a.x)/2,y:Math.sin(o)*v+Math.cos(o)*w+(t.y+a.y)/2},A={x:(l.x-v)/n,y:(l.y-w)/e},d=M({x:1,y:0},A),b=M(A,{x:(-l.x-v)/n,y:(-l.y-w)/e});!h&&b>0?b-=2*Math.PI:h&&b<0&&(b+=2*Math.PI);var m=d+(b%=2*Math.PI)*s,P=n*Math.cos(m),T=e*Math.sin(m);return {x:Math.cos(o)*P-Math.sin(o)*T+L.x,y:Math.sin(o)*P+Math.cos(o)*T+L.y,ellipticalArcStartAngle:d,ellipticalArcEndAngle:d+b,ellipticalArcAngle:m,ellipticalArcCenter:L,resultantRx:n,resultantRy:e}},f=function(t,n){t=t||500;for(var e,i=0,r=[],h=[],a=n(0),s=0;s<t;s++){var o=v(s*(1/t),0,1);e=n(o),i+=x(a,e),h.push([a,e]),r.push({t:o,arcLength:i}),a=e;}return e=n(1),h.push([a,e]),i+=x(a,e),r.push({t:1,arcLength:i}),{arcLength:i,arcLengthMap:r,approximationLines:h}},y=function(t,n){return (t%n+n)%n},p=function(t){return t*(Math.PI/180)},x=function(t,n){return Math.sqrt(Math.pow(n.x-t.x,2)+Math.pow(n.y-t.y,2))},v=function(t,n,e){return Math.min(Math.max(t,n),e)},M=function(t,n){var e=t.x*n.x+t.y*n.y,i=Math.sqrt((Math.pow(t.x,2)+Math.pow(t.y,2))*(Math.pow(n.x,2)+Math.pow(n.y,2)));return (t.x*n.y-t.y*n.x<0?-1:1)*Math.acos(e/i)},w=[[],[],[-.5773502691896257,.5773502691896257],[0,-.7745966692414834,.7745966692414834],[-.33998104358485626,.33998104358485626,-.8611363115940526,.8611363115940526],[0,-.5384693101056831,.5384693101056831,-.906179845938664,.906179845938664],[.6612093864662645,-.6612093864662645,-.2386191860831969,.2386191860831969,-.932469514203152,.932469514203152],[0,.4058451513773972,-.4058451513773972,-.7415311855993945,.7415311855993945,-.9491079123427585,.9491079123427585],[-.1834346424956498,.1834346424956498,-.525532409916329,.525532409916329,-.7966664774136267,.7966664774136267,-.9602898564975363,.9602898564975363],[0,-.8360311073266358,.8360311073266358,-.9681602395076261,.9681602395076261,-.3242534234038089,.3242534234038089,-.6133714327005904,.6133714327005904],[-.14887433898163122,.14887433898163122,-.4333953941292472,.4333953941292472,-.6794095682990244,.6794095682990244,-.8650633666889845,.8650633666889845,-.9739065285171717,.9739065285171717],[0,-.26954315595234496,.26954315595234496,-.5190961292068118,.5190961292068118,-.7301520055740494,.7301520055740494,-.8870625997680953,.8870625997680953,-.978228658146057,.978228658146057],[-.1252334085114689,.1252334085114689,-.3678314989981802,.3678314989981802,-.5873179542866175,.5873179542866175,-.7699026741943047,.7699026741943047,-.9041172563704749,.9041172563704749,-.9815606342467192,.9815606342467192],[0,-.2304583159551348,.2304583159551348,-.44849275103644687,.44849275103644687,-.6423493394403402,.6423493394403402,-.8015780907333099,.8015780907333099,-.9175983992229779,.9175983992229779,-.9841830547185881,.9841830547185881],[-.10805494870734367,.10805494870734367,-.31911236892788974,.31911236892788974,-.5152486363581541,.5152486363581541,-.6872929048116855,.6872929048116855,-.827201315069765,.827201315069765,-.9284348836635735,.9284348836635735,-.9862838086968123,.9862838086968123],[0,-.20119409399743451,.20119409399743451,-.3941513470775634,.3941513470775634,-.5709721726085388,.5709721726085388,-.7244177313601701,.7244177313601701,-.8482065834104272,.8482065834104272,-.937273392400706,.937273392400706,-.9879925180204854,.9879925180204854],[-.09501250983763744,.09501250983763744,-.2816035507792589,.2816035507792589,-.45801677765722737,.45801677765722737,-.6178762444026438,.6178762444026438,-.755404408355003,.755404408355003,-.8656312023878318,.8656312023878318,-.9445750230732326,.9445750230732326,-.9894009349916499,.9894009349916499],[0,-.17848418149584785,.17848418149584785,-.3512317634538763,.3512317634538763,-.5126905370864769,.5126905370864769,-.6576711592166907,.6576711592166907,-.7815140038968014,.7815140038968014,-.8802391537269859,.8802391537269859,-.9506755217687678,.9506755217687678,-.9905754753144174,.9905754753144174],[-.0847750130417353,.0847750130417353,-.2518862256915055,.2518862256915055,-.41175116146284263,.41175116146284263,-.5597708310739475,.5597708310739475,-.6916870430603532,.6916870430603532,-.8037049589725231,.8037049589725231,-.8926024664975557,.8926024664975557,-.9558239495713977,.9558239495713977,-.9915651684209309,.9915651684209309],[0,-.16035864564022537,.16035864564022537,-.31656409996362983,.31656409996362983,-.46457074137596094,.46457074137596094,-.600545304661681,.600545304661681,-.7209661773352294,.7209661773352294,-.8227146565371428,.8227146565371428,-.9031559036148179,.9031559036148179,-.96020815213483,.96020815213483,-.9924068438435844,.9924068438435844],[-.07652652113349734,.07652652113349734,-.22778585114164507,.22778585114164507,-.37370608871541955,.37370608871541955,-.5108670019508271,.5108670019508271,-.636053680726515,.636053680726515,-.7463319064601508,.7463319064601508,-.8391169718222188,.8391169718222188,-.912234428251326,.912234428251326,-.9639719272779138,.9639719272779138,-.9931285991850949,.9931285991850949],[0,-.1455618541608951,.1455618541608951,-.2880213168024011,.2880213168024011,-.4243421202074388,.4243421202074388,-.5516188358872198,.5516188358872198,-.6671388041974123,.6671388041974123,-.7684399634756779,.7684399634756779,-.8533633645833173,.8533633645833173,-.9200993341504008,.9200993341504008,-.9672268385663063,.9672268385663063,-.9937521706203895,.9937521706203895],[-.06973927331972223,.06973927331972223,-.20786042668822127,.20786042668822127,-.34193582089208424,.34193582089208424,-.469355837986757,.469355837986757,-.5876404035069116,.5876404035069116,-.6944872631866827,.6944872631866827,-.7878168059792081,.7878168059792081,-.8658125777203002,.8658125777203002,-.926956772187174,.926956772187174,-.9700604978354287,.9700604978354287,-.9942945854823992,.9942945854823992],[0,-.1332568242984661,.1332568242984661,-.26413568097034495,.26413568097034495,-.3903010380302908,.3903010380302908,-.5095014778460075,.5095014778460075,-.6196098757636461,.6196098757636461,-.7186613631319502,.7186613631319502,-.8048884016188399,.8048884016188399,-.8767523582704416,.8767523582704416,-.9329710868260161,.9329710868260161,-.9725424712181152,.9725424712181152,-.9947693349975522,.9947693349975522],[-.06405689286260563,.06405689286260563,-.1911188674736163,.1911188674736163,-.3150426796961634,.3150426796961634,-.4337935076260451,.4337935076260451,-.5454214713888396,.5454214713888396,-.6480936519369755,.6480936519369755,-.7401241915785544,.7401241915785544,-.820001985973903,.820001985973903,-.8864155270044011,.8864155270044011,-.9382745520027328,.9382745520027328,-.9747285559713095,.9747285559713095,-.9951872199970213,.9951872199970213]],L=[[],[],[1,1],[.8888888888888888,.5555555555555556,.5555555555555556],[.6521451548625461,.6521451548625461,.34785484513745385,.34785484513745385],[.5688888888888889,.47862867049936647,.47862867049936647,.23692688505618908,.23692688505618908],[.3607615730481386,.3607615730481386,.46791393457269104,.46791393457269104,.17132449237917036,.17132449237917036],[.4179591836734694,.3818300505051189,.3818300505051189,.27970539148927664,.27970539148927664,.1294849661688697,.1294849661688697],[.362683783378362,.362683783378362,.31370664587788727,.31370664587788727,.22238103445337448,.22238103445337448,.10122853629037626,.10122853629037626],[.3302393550012598,.1806481606948574,.1806481606948574,.08127438836157441,.08127438836157441,.31234707704000286,.31234707704000286,.26061069640293544,.26061069640293544],[.29552422471475287,.29552422471475287,.26926671930999635,.26926671930999635,.21908636251598204,.21908636251598204,.1494513491505806,.1494513491505806,.06667134430868814,.06667134430868814],[.2729250867779006,.26280454451024665,.26280454451024665,.23319376459199048,.23319376459199048,.18629021092773426,.18629021092773426,.1255803694649046,.1255803694649046,.05566856711617366,.05566856711617366],[.24914704581340277,.24914704581340277,.2334925365383548,.2334925365383548,.20316742672306592,.20316742672306592,.16007832854334622,.16007832854334622,.10693932599531843,.10693932599531843,.04717533638651183,.04717533638651183],[.2325515532308739,.22628318026289723,.22628318026289723,.2078160475368885,.2078160475368885,.17814598076194574,.17814598076194574,.13887351021978725,.13887351021978725,.09212149983772845,.09212149983772845,.04048400476531588,.04048400476531588],[.2152638534631578,.2152638534631578,.2051984637212956,.2051984637212956,.18553839747793782,.18553839747793782,.15720316715819355,.15720316715819355,.12151857068790319,.12151857068790319,.08015808715976021,.08015808715976021,.03511946033175186,.03511946033175186],[.2025782419255613,.19843148532711158,.19843148532711158,.1861610000155622,.1861610000155622,.16626920581699392,.16626920581699392,.13957067792615432,.13957067792615432,.10715922046717194,.10715922046717194,.07036604748810812,.07036604748810812,.03075324199611727,.03075324199611727],[.1894506104550685,.1894506104550685,.18260341504492358,.18260341504492358,.16915651939500254,.16915651939500254,.14959598881657674,.14959598881657674,.12462897125553388,.12462897125553388,.09515851168249279,.09515851168249279,.062253523938647894,.062253523938647894,.027152459411754096,.027152459411754096],[.17944647035620653,.17656270536699264,.17656270536699264,.16800410215645004,.16800410215645004,.15404576107681028,.15404576107681028,.13513636846852548,.13513636846852548,.11188384719340397,.11188384719340397,.08503614831717918,.08503614831717918,.0554595293739872,.0554595293739872,.02414830286854793,.02414830286854793],[.1691423829631436,.1691423829631436,.16427648374583273,.16427648374583273,.15468467512626524,.15468467512626524,.14064291467065065,.14064291467065065,.12255520671147846,.12255520671147846,.10094204410628717,.10094204410628717,.07642573025488905,.07642573025488905,.0497145488949698,.0497145488949698,.02161601352648331,.02161601352648331],[.1610544498487837,.15896884339395434,.15896884339395434,.15276604206585967,.15276604206585967,.1426067021736066,.1426067021736066,.12875396253933621,.12875396253933621,.11156664554733399,.11156664554733399,.09149002162245,.09149002162245,.06904454273764123,.06904454273764123,.0448142267656996,.0448142267656996,.019461788229726478,.019461788229726478],[.15275338713072584,.15275338713072584,.14917298647260374,.14917298647260374,.14209610931838204,.14209610931838204,.13168863844917664,.13168863844917664,.11819453196151841,.11819453196151841,.10193011981724044,.10193011981724044,.08327674157670475,.08327674157670475,.06267204833410907,.06267204833410907,.04060142980038694,.04060142980038694,.017614007139152118,.017614007139152118],[.14608113364969041,.14452440398997005,.14452440398997005,.13988739479107315,.13988739479107315,.13226893863333747,.13226893863333747,.12183141605372853,.12183141605372853,.10879729916714838,.10879729916714838,.09344442345603386,.09344442345603386,.0761001136283793,.0761001136283793,.057134425426857205,.057134425426857205,.036953789770852494,.036953789770852494,.016017228257774335,.016017228257774335],[.13925187285563198,.13925187285563198,.13654149834601517,.13654149834601517,.13117350478706238,.13117350478706238,.12325237681051242,.12325237681051242,.11293229608053922,.11293229608053922,.10041414444288096,.10041414444288096,.08594160621706773,.08594160621706773,.06979646842452049,.06979646842452049,.052293335152683286,.052293335152683286,.03377490158481415,.03377490158481415,.0146279952982722,.0146279952982722],[.13365457218610619,.1324620394046966,.1324620394046966,.12890572218808216,.12890572218808216,.12304908430672953,.12304908430672953,.11499664022241136,.11499664022241136,.10489209146454141,.10489209146454141,.09291576606003515,.09291576606003515,.07928141177671895,.07928141177671895,.06423242140852585,.06423242140852585,.04803767173108467,.04803767173108467,.030988005856979445,.030988005856979445,.013411859487141771,.013411859487141771],[.12793819534675216,.12793819534675216,.1258374563468283,.1258374563468283,.12167047292780339,.12167047292780339,.1155056680537256,.1155056680537256,.10744427011596563,.10744427011596563,.09761865210411388,.09761865210411388,.08619016153195327,.08619016153195327,.0733464814110803,.0733464814110803,.05929858491543678,.05929858491543678,.04427743881741981,.04427743881741981,.028531388628933663,.028531388628933663,.0123412297999872,.0123412297999872]],A=[[1],[1,1],[1,2,1],[1,3,3,1]],d=function(t,n,e){return {x:(1-e)*(1-e)*(1-e)*t[0]+3*(1-e)*(1-e)*e*t[1]+3*(1-e)*e*e*t[2]+e*e*e*t[3],y:(1-e)*(1-e)*(1-e)*n[0]+3*(1-e)*(1-e)*e*n[1]+3*(1-e)*e*e*n[2]+e*e*e*n[3]}},b=function(t,n,e){return P([3*(t[1]-t[0]),3*(t[2]-t[1]),3*(t[3]-t[2])],[3*(n[1]-n[0]),3*(n[2]-n[1]),3*(n[3]-n[2])],e)},m=function(t,n,e){var i,r,h;i=e/2,r=0;for(var a=0;a<20;a++)h=i*w[20][a]+i,r+=L[20][a]*_(t,n,h);return i*r},P=function(t,n,e){return {x:(1-e)*(1-e)*t[0]+2*(1-e)*e*t[1]+e*e*t[2],y:(1-e)*(1-e)*n[0]+2*(1-e)*e*n[1]+e*e*n[2]}},T=function(t,n,e){void 0===e&&(e=1);var i=t[0]-2*t[1]+t[2],r=n[0]-2*n[1]+n[2],h=2*t[1]-2*t[0],a=2*n[1]-2*n[0],s=4*(i*i+r*r),o=4*(i*h+r*a),g=h*h+a*a;if(0===s)return e*Math.sqrt(Math.pow(t[2]-t[0],2)+Math.pow(n[2]-n[0],2));var u=o/(2*s),l=e+u,c=g/s-u*u,f=l*l+c>0?Math.sqrt(l*l+c):0,y=u*u+c>0?Math.sqrt(u*u+c):0,p=u+Math.sqrt(u*u+c)!==0&&(l+f)/(u+y)!=0?c*Math.log(Math.abs((l+f)/(u+y))):0;return Math.sqrt(s)/2*(l*f-u*y+p)},q=function(t,n,e){return {x:2*(1-e)*(t[1]-t[0])+2*e*(t[2]-t[1]),y:2*(1-e)*(n[1]-n[0])+2*e*(n[2]-n[1])}};function _(t,n,e){var i=S(1,e,t),r=S(1,e,n),h=i*i+r*r;return Math.sqrt(h)}var S=function t(n,e,i){var r,h,a=i.length-1;if(0===a)return 0;if(0===n){h=0;for(var s=0;s<=a;s++)h+=A[a][s]*Math.pow(1-e,a-s)*Math.pow(e,s)*i[s];return h}r=new Array(a);for(var o=0;o<a;o++)r[o]=a*(i[o+1]-i[o]);return t(n-1,e,r)},N=function(t,n,e){for(var i=1,r=t/n,h=(t-e(r))/n,a=0;i>.001;){var s=e(r+h),o=Math.abs(t-s)/n;if(o<i)i=o,r+=h;else {var g=e(r-h),u=Math.abs(t-g)/n;u<i?(i=u,r-=h):h/=2;}if(++a>500)break}return r},C=n((function(t,n,i,r,h,a,s,o){var g=this;e(this,"a",void 0),e(this,"b",void 0),e(this,"c",void 0),e(this,"d",void 0),e(this,"length",void 0),e(this,"getArcLength",void 0),e(this,"getPoint",void 0),e(this,"getDerivative",void 0),e(this,"getTotalLength",(function(){return g.length})),e(this,"getPointAtLength",(function(t){var n=[g.a.x,g.b.x,g.c.x,g.d.x],e=[g.a.y,g.b.y,g.c.y,g.d.y],i=N(t,g.length,(function(t){return g.getArcLength(n,e,t)}));return g.getPoint(n,e,i)})),e(this,"getTangentAtLength",(function(t){var n=[g.a.x,g.b.x,g.c.x,g.d.x],e=[g.a.y,g.b.y,g.c.y,g.d.y],i=N(t,g.length,(function(t){return g.getArcLength(n,e,t)})),r=g.getDerivative(n,e,i),h=Math.sqrt(r.x*r.x+r.y*r.y);return h>0?{x:r.x/h,y:r.y/h}:{x:0,y:0}})),e(this,"getPropertiesAtLength",(function(t){var n,e=[g.a.x,g.b.x,g.c.x,g.d.x],i=[g.a.y,g.b.y,g.c.y,g.d.y],r=N(t,g.length,(function(t){return g.getArcLength(e,i,t)})),h=g.getDerivative(e,i,r),a=Math.sqrt(h.x*h.x+h.y*h.y);n=a>0?{x:h.x/a,y:h.y/a}:{x:0,y:0};var s=g.getPoint(e,i,r);return {x:s.x,y:s.y,tangentX:n.x,tangentY:n.y}})),e(this,"getC",(function(){return g.c})),e(this,"getD",(function(){return g.d})),this.a={x:t,y:n},this.b={x:i,y:r},this.c={x:h,y:a},void 0!==s&&void 0!==o?(this.getArcLength=m,this.getPoint=d,this.getDerivative=b,this.d={x:s,y:o}):(this.getArcLength=T,this.getPoint=P,this.getDerivative=q,this.d={x:0,y:0}),this.length=this.getArcLength([this.a.x,this.b.x,this.c.x,this.d.x],[this.a.y,this.b.y,this.c.y,this.d.y],1);})),O=n((function(t){var n=this;e(this,"length",0),e(this,"partial_lengths",[]),e(this,"functions",[]),e(this,"initial_point",null),e(this,"getPartAtLength",(function(t){t<0?t=0:t>n.length&&(t=n.length);for(var e=n.partial_lengths.length-1;n.partial_lengths[e]>=t&&e>0;)e--;return e++,{fraction:t-n.partial_lengths[e-1],i:e}})),e(this,"getTotalLength",(function(){return n.length})),e(this,"getPointAtLength",(function(t){var e=n.getPartAtLength(t),i=n.functions[e.i];if(i)return i.getPointAtLength(e.fraction);if(n.initial_point)return n.initial_point;throw new Error("Wrong function at this part.")})),e(this,"getTangentAtLength",(function(t){var e=n.getPartAtLength(t),i=n.functions[e.i];if(i)return i.getTangentAtLength(e.fraction);if(n.initial_point)return {x:0,y:0};throw new Error("Wrong function at this part.")})),e(this,"getPropertiesAtLength",(function(t){var e=n.getPartAtLength(t),i=n.functions[e.i];if(i)return i.getPropertiesAtLength(e.fraction);if(n.initial_point)return {x:n.initial_point.x,y:n.initial_point.y,tangentX:0,tangentY:0};throw new Error("Wrong function at this part.")})),e(this,"getParts",(function(){for(var t=[],e=0;e<n.functions.length;e++)if(null!==n.functions[e]){n.functions[e]=n.functions[e];var i={start:n.functions[e].getPointAtLength(0),end:n.functions[e].getPointAtLength(n.partial_lengths[e]-n.partial_lengths[e-1]),length:n.partial_lengths[e]-n.partial_lengths[e-1],getPointAtLength:n.functions[e].getPointAtLength,getTangentAtLength:n.functions[e].getTangentAtLength,getPropertiesAtLength:n.functions[e].getPropertiesAtLength};t.push(i);}return t}));for(var r,h=Array.isArray(t)?t:function(t){var n=(t&&t.length>0?t:"M0,0").match(s);if(!n)throw new Error("No path elements found in string ".concat(t));return n.reduce((function(t,n){var e=n.charAt(0),r=e.toLowerCase(),h=g(n.substring(1));if("m"===r&&h.length>2&&(t.push([e].concat(i(h.splice(0,2)))),r="l",e="m"===e?"l":"L"),"a"===r.toLowerCase()&&(5===h.length||6===h.length)){var s=n.substring(1).trim().split(" ");h=[Number(s[0]),Number(s[1]),Number(s[2]),Number(s[3].charAt(0)),Number(s[3].charAt(1)),Number(s[3].substring(2)),Number(s[4])];}for(;h.length>=0;){if(h.length===a[r]){t.push([e].concat(i(h.splice(0,a[r]))));break}if(h.length<a[r])throw new Error('Malformed path data: "'.concat(e,'" must have ').concat(a[r]," elements and has ").concat(h.length,": ").concat(n));t.push([e].concat(i(h.splice(0,a[r]))));}return t}),[])}(t),o=[0,0],c=[0,0],f=[0,0],y=0;y<h.length;y++){if("M"===h[y][0])f=[(o=[h[y][1],h[y][2]])[0],o[1]],this.functions.push(null),0===y&&(this.initial_point={x:h[y][1],y:h[y][2]});else if("m"===h[y][0])f=[(o=[h[y][1]+o[0],h[y][2]+o[1]])[0],o[1]],this.functions.push(null);else if("L"===h[y][0])this.length+=Math.sqrt(Math.pow(o[0]-h[y][1],2)+Math.pow(o[1]-h[y][2],2)),this.functions.push(new u(o[0],h[y][1],o[1],h[y][2])),o=[h[y][1],h[y][2]];else if("l"===h[y][0])this.length+=Math.sqrt(Math.pow(h[y][1],2)+Math.pow(h[y][2],2)),this.functions.push(new u(o[0],h[y][1]+o[0],o[1],h[y][2]+o[1])),o=[h[y][1]+o[0],h[y][2]+o[1]];else if("H"===h[y][0])this.length+=Math.abs(o[0]-h[y][1]),this.functions.push(new u(o[0],h[y][1],o[1],o[1])),o[0]=h[y][1];else if("h"===h[y][0])this.length+=Math.abs(h[y][1]),this.functions.push(new u(o[0],o[0]+h[y][1],o[1],o[1])),o[0]=h[y][1]+o[0];else if("V"===h[y][0])this.length+=Math.abs(o[1]-h[y][1]),this.functions.push(new u(o[0],o[0],o[1],h[y][1])),o[1]=h[y][1];else if("v"===h[y][0])this.length+=Math.abs(h[y][1]),this.functions.push(new u(o[0],o[0],o[1],o[1]+h[y][1])),o[1]=h[y][1]+o[1];else if("z"===h[y][0]||"Z"===h[y][0])this.length+=Math.sqrt(Math.pow(f[0]-o[0],2)+Math.pow(f[1]-o[1],2)),this.functions.push(new u(o[0],f[0],o[1],f[1])),o=[f[0],f[1]];else if("C"===h[y][0])r=new C(o[0],o[1],h[y][1],h[y][2],h[y][3],h[y][4],h[y][5],h[y][6]),this.length+=r.getTotalLength(),o=[h[y][5],h[y][6]],this.functions.push(r);else if("c"===h[y][0])(r=new C(o[0],o[1],o[0]+h[y][1],o[1]+h[y][2],o[0]+h[y][3],o[1]+h[y][4],o[0]+h[y][5],o[1]+h[y][6])).getTotalLength()>0?(this.length+=r.getTotalLength(),this.functions.push(r),o=[h[y][5]+o[0],h[y][6]+o[1]]):this.functions.push(new u(o[0],o[0],o[1],o[1]));else if("S"===h[y][0]){if(y>0&&["C","c","S","s"].indexOf(h[y-1][0])>-1){if(r){var p=r.getC();r=new C(o[0],o[1],2*o[0]-p.x,2*o[1]-p.y,h[y][1],h[y][2],h[y][3],h[y][4]);}}else r=new C(o[0],o[1],o[0],o[1],h[y][1],h[y][2],h[y][3],h[y][4]);r&&(this.length+=r.getTotalLength(),o=[h[y][3],h[y][4]],this.functions.push(r));}else if("s"===h[y][0]){if(y>0&&["C","c","S","s"].indexOf(h[y-1][0])>-1){if(r){var x=r.getC(),v=r.getD();r=new C(o[0],o[1],o[0]+v.x-x.x,o[1]+v.y-x.y,o[0]+h[y][1],o[1]+h[y][2],o[0]+h[y][3],o[1]+h[y][4]);}}else r=new C(o[0],o[1],o[0],o[1],o[0]+h[y][1],o[1]+h[y][2],o[0]+h[y][3],o[1]+h[y][4]);r&&(this.length+=r.getTotalLength(),o=[h[y][3]+o[0],h[y][4]+o[1]],this.functions.push(r));}else if("Q"===h[y][0]){if(o[0]==h[y][1]&&o[1]==h[y][2]){var M=new u(h[y][1],h[y][3],h[y][2],h[y][4]);this.length+=M.getTotalLength(),this.functions.push(M);}else r=new C(o[0],o[1],h[y][1],h[y][2],h[y][3],h[y][4],void 0,void 0),this.length+=r.getTotalLength(),this.functions.push(r);o=[h[y][3],h[y][4]],c=[h[y][1],h[y][2]];}else if("q"===h[y][0]){if(0!=h[y][1]||0!=h[y][2])r=new C(o[0],o[1],o[0]+h[y][1],o[1]+h[y][2],o[0]+h[y][3],o[1]+h[y][4],void 0,void 0),this.length+=r.getTotalLength(),this.functions.push(r);else {var w=new u(o[0]+h[y][1],o[0]+h[y][3],o[1]+h[y][2],o[1]+h[y][4]);this.length+=w.getTotalLength(),this.functions.push(w);}c=[o[0]+h[y][1],o[1]+h[y][2]],o=[h[y][3]+o[0],h[y][4]+o[1]];}else if("T"===h[y][0]){if(y>0&&["Q","q","T","t"].indexOf(h[y-1][0])>-1)r=new C(o[0],o[1],2*o[0]-c[0],2*o[1]-c[1],h[y][1],h[y][2],void 0,void 0),this.functions.push(r),this.length+=r.getTotalLength();else {var L=new u(o[0],h[y][1],o[1],h[y][2]);this.functions.push(L),this.length+=L.getTotalLength();}c=[2*o[0]-c[0],2*o[1]-c[1]],o=[h[y][1],h[y][2]];}else if("t"===h[y][0]){if(y>0&&["Q","q","T","t"].indexOf(h[y-1][0])>-1)r=new C(o[0],o[1],2*o[0]-c[0],2*o[1]-c[1],o[0]+h[y][1],o[1]+h[y][2],void 0,void 0),this.length+=r.getTotalLength(),this.functions.push(r);else {var A=new u(o[0],o[0]+h[y][1],o[1],o[1]+h[y][2]);this.length+=A.getTotalLength(),this.functions.push(A);}c=[2*o[0]-c[0],2*o[1]-c[1]],o=[h[y][1]+o[0],h[y][2]+o[1]];}else if("A"===h[y][0]){var d=new l(o[0],o[1],h[y][1],h[y][2],h[y][3],1===h[y][4],1===h[y][5],h[y][6],h[y][7]);this.length+=d.getTotalLength(),o=[h[y][6],h[y][7]],this.functions.push(d);}else if("a"===h[y][0]){var b=new l(o[0],o[1],h[y][1],h[y][2],h[y][3],1===h[y][4],1===h[y][5],o[0]+h[y][6],o[1]+h[y][7]);this.length+=b.getTotalLength(),o=[o[0]+h[y][6],o[1]+h[y][7]],this.functions.push(b);}this.partial_lengths.push(this.length);}})),j=n((function(t){var n=this;if(e(this,"inst",void 0),e(this,"getTotalLength",(function(){return n.inst.getTotalLength()})),e(this,"getPointAtLength",(function(t){return n.inst.getPointAtLength(t)})),e(this,"getTangentAtLength",(function(t){return n.inst.getTangentAtLength(t)})),e(this,"getPropertiesAtLength",(function(t){return n.inst.getPropertiesAtLength(t)})),e(this,"getParts",(function(){return n.inst.getParts()})),this.inst=new O(t),!(this instanceof j))return new j(t)}));

/**
 * A plugin which enables rendering of math equations inside
 * of reveal.js slides. Essentially a thin wrapper for KaTeX.
 *
 * @author Hakim El Hattab
 * @author Gerhard Burger
 */

let renderMathInElement;

/**
 * A plugin MJP enables Manim-like animation and acts as a post-processor
 * 
 * https://www.cianlm.dev/
 *
 * @author Cian Luke Martin
 */

function MJP(stdout) {
    let id_and_length  = [];
    
	
    stdout = stdout.replaceAll(/fill="(.+?)"/g, (m , c) => m + ` color="${c}"`);
    // Get rid of stroke-width="0" stuff
    stdout = stdout.replaceAll(/stroke-width=".+?"/g,"");
    // Remove empty paths
    stdout = stdout.replaceAll('d=""','d="M 0 0"');
    // Rename data-c to id
    stdout = stdout.replaceAll("data-c","id");
    // Make all ids unique by prepending a random string
    stdout = stdout.replaceAll(/use id="(.+?)"/g, (match , id) => {
        const rand_id = Math.random().toString(36).slice(2);
        // stdout.replace(`href="#${id}"`,`href="#${id}_${rand_id}"`)
        return `use id="${id}_${rand_id}"`
    });
    // Collect total lengths
    // Make sure to use non-greedy regex. (.+?) is grabbing too much.
    stdout.replaceAll(/id="(.+?)" d="(.+?)"/g, (match, id , svg_path) => {
        try {
            // console.info(svg_path)
            const properties = new j(svg_path);
            const length =  properties.getTotalLength();
            // console.log(`Path String/Total Length: ${match.length}/${length}`)
            id_and_length.push([id, length]);
            return match 
        } catch(e) {
            console.error(`Error: ${e}`);
            // id_and_length.push([id, 0])
            console.warn(svg_path);
            return match
        }
    });
    // console.log(id_and_length)
    // Add total lengths to the corresponding <use> tags with the same id
    for (let i = 0; i < id_and_length.length; i++) {
        const id = id_and_length[i][0];
        const length = id_and_length[i][1];
        stdout = stdout.replaceAll(new RegExp(`<path id="${id}"`,'g'), (match) => {
            return match + ` style="color : inherit" stroke-dasharray="${length}" stroke-dashoffset="${length}"`
        });
    }
          return stdout
}

function DrawSVG(svg, gradient, slide, delay_inc, base_delay, slide_duration) {
    if (slide === void 0) { slide = false; }
    if (delay_inc === void 0) { delay_inc = 0.2; }
    if (base_delay === void 0) { base_delay = 0; }
    if (slide_duration === void 0) { slide_duration = 5; }
    // console.log(tex)
    var box_counter = 0;
    var box_fix = svg.replaceAll(/(<rect )(.+?\/rect>)/g, function (match, g1, g2) {
        // console.log('box_counter='+box_counter)
        box_counter++;
        var rand_id = Math.random().toString(36).slice(2);
        return "<defs>" + g1 + ("id=\"box_counter" + box_counter + "_" + rand_id + "\" ") + g2 + "</defs>" +
            ("<use stroke=\"none\" fill=\"currentColor\" href=\"#box_counter" + box_counter + "_" + rand_id + "\"></use>");
    });
    var stroke_fix = box_fix.replaceAll('<g', '<g stroke="currentColor"');
    // Gradients
    var gradient_svg = stroke_fix;
    // console.log(gradient.length)
    if (gradient.length != 0) {
        // @ts-ignore
        var viewBox_1 = gradient_svg.match(/viewBox="(.+?)"/)[1].split(' ')[1];
        // console.log(viewBox)
        var rand_id_1 = Math.random().toString(36).slice(2);
        // regex for <svg ...> is /<svg[^>]*>/
        // explanation: [^>]* means any character except >, repeated 0 or more times
        if (slide) {
            gradient_svg = slide_gradient(rand_id_1, viewBox_1, gradient_svg, gradient, slide_duration);
        }
        else {
            gradient_svg = gradient_svg.replace(/<svg[^>]*>/, function (match) {
                var linear_gradient = "\n                    <linearGradient id=\"gradient" + rand_id_1 + "\" x1=\"0%\" y1=\"50%\" x2=\"100%\" y2=\"50%\">\n                    " + gradient.map(function (color, index) {
                    return "<stop offset=\"" + Math.round(100 * index / (gradient.length - 1)) + "%\" stop-color=\"" + color + "\"></stop>";
                }).join('') + "\n                </linearGradient>";
                var rect = "<rect id=\"rect" + rand_id_1 + "\" x=\"-5%\" y=\"" + viewBox_1 * 1.1 + "\" width=\"110%\" height=\"120%\" fill=\"url(#gradient" + rand_id_1 + ")\" />";
                return match + "<defs>" + linear_gradient + rect + "</defs>";
            });
        }
        gradient_svg = gradient_svg.replace("</defs>", function (match) {
            return match + ("<mask id=\"mask" + rand_id_1 + "\">");
        });
        gradient_svg = gradient_svg.replace("</svg>", function (match) {
            return "</mask>" + ("<use href=\"#rect" + rand_id_1 + "\" mask=\"url(#mask" + rand_id_1 + ")\" />") + match;
        });
    }

    var path_style = gradient_svg.replaceAll(/<path /g, function (match) {
        delay += delay_inc;
        return match + ("style=\"" + (gradient.length ? 'color : white' : '') + "; stroke-width: 20px; fill: none;\n animation: inherit\"");
    });

    var delay = -delay_inc + base_delay;
    var animated = path_style.replaceAll(/<use /g, function (match) {
        delay += delay_inc;
        return match + ("style=\"" + (gradient.length ? 'color : white' : '') + "; stroke-width: 20px; fill: none;\n        animation: 2s ease " + delay + "s 1 normal forwards running line-anim,\n        2s ease " + (1 + delay) + "s 1 normal forwards running fill;\"");
    });
    return animated;
}

function slide_gradient(rand_id, viewBox, str, gradient, duration) {
    return str.replace(/<svg[^>]*>/, function (match) {
        // 0 => -100, 0, 100, 1 => -50, 50,
        // 0 => -100, 0, 100, 1=> -75, 25, 2=> -50, 50, 3=> -25, 75
        var percent = function (index) { return Math.round(100 * index / (gradient.length - 1)) / 2; };
        var slide_gradient = "\n        <linearGradient id=\"gradient" + rand_id + "\" x1=\"0%\" y1=\"50%\" x2=\"100%\" y2=\"50%\">\n        " + (gradient.map(function (color, index) {
            return "<stop offset=\"" + (percent(index) - 100) + "%\" stop-color=\"" + color + "\">\n                <animate attributeName=\"offset\" dur=\"" + duration + "s\" repeatCount=\"indefinite\" values=\"" + (percent(index) - 100) + "%;" + percent(index) + "%\"></animate>\n            </stop>";
        }).join('') + gradient.map(function (color, index) {
            return "<stop offset=\"" + percent(index) + "%\" stop-color=\"" + color + "\">\n                    <animate attributeName=\"offset\" dur=\"" + duration + "s\" repeatCount=\"indefinite\" values=\"" + percent(index) + "%;" + (percent(index) + 100) + "%\"></animate>\n                </stop>";
        }).join('') +
            ("<stop offset=\"" + 100 + "%\" stop-color=\"" + gradient[0] + "\">\n                    <animate attributeName=\"offset\" dur=\"" + duration + "s\" repeatCount=\"indefinite\" values=\"" + 100 + "%;" + 200 + "%\"></animate>\n                </stop>")) + " </linearGradient>";
        var rect = "<rect id=\"rect" + rand_id + "\" x=\"-5%\" y=\"" + viewBox * 1.1 + "\" width=\"110%\" height=\"120%\" fill=\"url(#gradient" + rand_id + ")\" />";
        return match + "<defs>" + slide_gradient + rect + "</defs>";
    });
}

const extractOpts = (parent) => {
	return [
		parent.dataset.eqGradient ? JSON.parse(parent.dataset.eqGradient.replaceAll("'", '"')) : [],
		parent.dataset.eqColorPrecess == "true",
		parent.dataset.eqSpeed ? parseFloat(parent.dataset.eqSpeed) : 0.3,
		parent.dataset.eqDelay ? parseFloat(parent.dataset.eqDelay) : 0,
		parent.dataset.eqPrecessPeriod ? parseFloat(parent.dataset.eqPrecessPeriod) : 5
	]
};

const applyAnimation = (svg, span, opts) => {
	const processed = DrawSVG(MJP(svg),
		...opts
	);

	span.innerHTML = processed;
	span.firstChild.classList.add('mt-6', 'mb-6', 'ml-auto', 'mr-auto');
};

const applyPlaceholder = (svg, span, opts) => {
	span.innerHTML = svg;
	span.firstChild.classList.add('mt-6', 'mb-6', 'ml-auto', 'mr-auto', 'opacity-0');
};

const manimTags = {'eqStatic': false,  'eqSpeed':0.3, 'eqGradient':[], 'eqColorPrecess':false, 'eqDelay':0};

const KaTeX = () => {
	let deck;



	let defaultOptions = {
		version: 'latest',
		delimiters: [
			{left: '$$', right: '$$', display: true}, // Note: $$ has to come before $
			{left: '$', right: '$', display: false},
			{left: '\\(', right: '\\)', display: false},
			{left: '\\[', right: '\\]', display: true}
		],
		ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
		customRenderer: (math, span, fragment, opts, parent) => {
			const o = {};
    		o.display = true;
			//console.log('Process EQ');
			//console.log(window.MathJax);
			if (!window.MathJax) return false;

			const dataset = Object.keys(parent.dataset);
			console.log(dataset);
			
			if (!(Object.keys(manimTags).some(v => dataset.includes(v)))) return false;

			const svg = MathJax.tex2svg(math.data, o);
			const svg_content = svg.innerHTML;
			svg.remove();

			if (parent.dataset.eqStatic) {
				span.innerHTML = svg_content;
				span.firstChild.classList.add('mt-6', 'mb-6', 'ml-auto', 'mr-auto');
				fragment.appendChild(span);
				return true;
			}

			const options = extractOpts(parent);

			if (dataset.includes('fragmentIndex')) {
				applyPlaceholder(svg_content, span);
				parseInt(parent.dataset.fragmentIndex);

				deck.on( 'slidechanged', event => {
					// event.previousSlide, event.currentSlide, event.indexh, event.indexv
					const slide = event.indexh;
					console.log(slide);
					if (event.previousSlide == event.currentSlide) return;
			
					/*if (event.currentSlide.contains(span)) { //Horribly slow!!!
						applyAnimation(svg_content, span, options);
					}*/
			
				  } );
			
				  deck.on( 'fragmentshown', (event) => {
					deck.getState();
			   
					
					if (event.fragment == parent) { 
						console.log(parent);
						console.log('animate tex!');
						applyAnimation(svg_content, span, options);
					}

					//if (Object.keys(events).includes(String(state.indexh))) {
					 // fragmentFire(state.indexh, state.indexf);
					//}
				  } );			

			} else {

				if (deck.getCurrentSlide().contains(parent)) { //Horribly slow!!!
					console.log('Early bird!');
					applyAnimation(svg_content, span, options);
				}

				deck.on( 'slidechanged', event => {
					// event.previousSlide, event.currentSlide, event.indexh, event.indexv
					const slide = event.indexh;
					console.log(slide);
					if (event.previousSlide == event.currentSlide) return;
			
					if (event.currentSlide.contains(parent)) { //Horribly slow!!!
						applyAnimation(svg_content, span, options);
					}
			
				  } );		

				//applyAnimation(svg_content, span, options);
			}


			
    		
			fragment.appendChild(span);
			
			return true;
		}
		/*postRender: (element) => {
			console.log(DrawSVG(element.innerHTML, [], true, 0.2, 0.2));

			return element;
		}*/
	};

	/**
	 * Loads a JavaScript file and returns a Promise for when it is loaded
	 * Credits: https://aaronsmith.online/easily-load-an-external-script-using-javascript/
	 */

	return {
		id: 'katex',

		init: function (reveal) {

			deck = reveal;

			let revealOptions = deck.getConfig().katex || {};

			({...defaultOptions, ...revealOptions});


			const renderMath = () => {
				const el = reveal.getSlidesElement();
				console.warn(el);
				renderMathInElement(el, defaultOptions);
				deck.layout();
			};

			//loadCss(cssUrl);

			// For some reason dynamically loading with defer attribute doesn't result in the expected behavior, the below code does
			if (!renderMathInElement) {
				window.interpretate.shared.katex.load().then(() => {
					renderMathInElement = window.interpretate.shared.katex.autorender;
					console.log(renderMathInElement);

					if( deck.isReady() ) {
						renderMath();
					}
					else {
						deck.on( 'ready', renderMath.bind( this ) );
					}
				});
			} else {
				renderMathInElement = window.interpretate.shared.katex.autorender;
				console.log(renderMathInElement);

				if( deck.isReady() ) {
					renderMath();
				}
				else {
					deck.on( 'ready', renderMath.bind( this ) );
				}
			}
			//if (!d3) d3 = interpretate.shared.d3.d3;

		}
	}

};

async function runModuleSnippetsInOrder(snippets, afterAll) {
  for (const code of snippets) {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    try {
      await import(url);               // waits for full evaluation
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  if (afterAll) afterAll();
}

const splitStringIntoChunks = (str, chunkSize) => {
  if (!str || chunkSize <= 0) return [];
  
  const chunks = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, Math.min(i + chunkSize, str.length)));
  }
  return chunks;
};

const pasteFile = {
  transaction: (ev, view, id, length) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      const channel = view.dom.ocellref.origin.channel;
      server._emitt(channel, `<|"Channel"->"${id}", "Length"->${length}, "CellType"->"md"|>`, 'Forwarded["CM:PasteEvent"]');
    }
  },

  file: (ev, view, id, name, result) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      if (result.length > 5 * 1024 * 1024) {
        const chunks = splitStringIntoChunks(result, 5 * 1024 * 1024);
        chunks.forEach((chunk, index) => {
          server.emitt(id, `<|"Data"->"${chunk}", "Name"->"${name}", "Chunk"->${index+1}, "Chunks"->${chunks.length}|>`, 'Chunk');
        });
      } else {
        server.emitt(id, `<|"Data"->"${result}", "Name"->"${name}"|>`, 'File');
      }
    }
  }
};

const pasteDrop = {
  transaction: (ev, view, id, length) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      const channel = view.dom.ocellref.origin.channel;
      server._emitt(channel, `<|"Channel"->"${id}", "Length"->${length}, "CellType"->"md"|>`, 'Forwarded["CM:DropEvent"]');
    }
  },

  file: (ev, view, id, name, result) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      if (result.length > 5 * 1024 * 1024) {
        const chunks = splitStringIntoChunks(result, 5 * 1024 * 1024);
        chunks.forEach((chunk, index) => {
          server.emitt(id, `<|"Data"->"${chunk}", "Name"->"${name}", "Chunk"->${index+1}, "Chunks"->${chunks.length}|>`, 'Chunk');
        });
      } else {
        server.emitt(id, `<|"Data"->"${result}", "Name"->"${name}"|>`, 'File');
      }
    }
  }
};





function unicodeToChar(text) {
  return text.replace(/\\:[\da-f]{4}/gi, 
         function (match) {
              return String.fromCharCode(parseInt(match.replace(/\\:/g, ''), 16));
         });
}
const decks = {};

let JaxLoaded = false;

core.FrontSlidesSelected = async (args, env) => {
  console.log('Slide event!');

  const type = await interpretate(args[0], env);
  const data = await interpretate(args[1], env);
  let res;

  Object.values(decks).forEach((deck) => {
    res = deck[type](data);
  });

  //returnn last
  return res;
};

core['CoffeeLiqueur`Extensions`SlidesTools`FrontSlidesSelected'] = core.FrontSlidesSelected;

let cnt = 0;

class RevealJSCell {
    envs = []
    events
    cnt

    dispose() {

      if (this.observer) clearInterval(this.observer);
      
      console.warn('slide got disposed!');

      if (this.events) {
        for (const key of Object.keys(this.events)) {
          this.events[key].forEach((el) => server.kernel.io.fire(el[0], true, 'Destroy'));
        }
      }

      console.warn('WLX cell dispose...');
      if (this.envs) {
        for (const env of this.envs) {
          for (const obj of Object.values(env.global.stack))  {
            console.log('dispose');
            obj.dispose();
          }
        }
      }

      delete decks[this.uid];

      this.deck.destroy();
    }

    makeStandardSize() {
      this.parent.element.style.width = "960px";
      this.parent.element.style.height = "700px";
    }

    setResizer(res) {
      this.parent.element.style.resize = res ? 'vertical' : 'unset';
    }
    
    constructor(parent, data) {
      const self = this;
      this.parent = parent;

      let deck = new _$1(parent.element, {
        embedded: true,
        keyboard: true,

        // Optional function that blocks keyboard events when retuning false
        //
        // If you set this to 'focused', we will only capture keyboard events
        // for embedded decks when they are in focus
        keyboardCondition: null,
        slideNumber: true,
        viewDistance: 999999,
        plugins: [ Plugin, KaTeX, RevealPointer /*, RevealDrawer(self)*/ ],
        pointer: {
          key: "q", // key to enable pointer, default "q", not case-sensitive
          opacity: 0.8, // opacity of cursor, default 0.8
          pointerSize: 12, // pointer size in px, default 12
          alwaysVisible: false, // should pointer mode be always visible? default "false"
          tailLength: 10, // NOT IMPLEMENTED YET!!! how long the "tail" should be? default 10
        }/*,

        drawer: {
          toggleDrawKey: "d", // (optional) key to enable drawing, default "d"
          toggleBoardKey: "t", // (optional) key to show drawing board, default "t"
          colors: ["#fa1e0e", "#8ac926", "#1982c4", "#ffca3a"], // (optional) list of colors avaiable (hex color codes)
          color: "#FF0000", // (optional) color of a cursor, first color from `codes` is a default
          pathSize: 4, // (optional) path size in px, default 4
        }*/
      } );

      const container = document.createElement('div');
      container.classList.add('reveal');

      const slides = document.createElement('div');
      slides.classList.add('slides');

      container.appendChild(slides);

      parent.element.appendChild(container);

      
      if (!core._isWindow) {
        parent.element.classList.add('reveal-fixed-height');
        parent.element.style.resize = 'vertical';
        let oldHeight = parent.element.style.height;
        this.observer = setInterval(() => {
          if (!parent?.element?.style) return;
          const newHight = parent.element.style.height;
          if (oldHeight != newHight) {
            oldHeight = newHight;
            console.warn('Relayout. Vertical size does not match');
            if (deck) deck.layout();
          }
        }, 2000);
      }

      parent.element.classList.add('padding-fix');

      //parent.element.style.height = "500px";

    

      let string = `
      <section data-markdown>
      <textarea data-template>
          ${data}
      </textarea>
      </section>      
      `;

      const r = {
        scripts: new RegExp(/<(?:[^>:\s]+:)?script\b[^>]*>([\s\S]*?)<\/(?:[^>:\s]+:)?script>/gi),
        events: new RegExp(/RVJSEvent\["([^"]+)","([^"]+)"\]/g),
        fe: new RegExp(/FrontEndExecutable\[([^\[|\]]+)\]/g),
        feh: new RegExp(/FrontEndExecutableHold\[([^\[|\]]+)\]/g)
      };
      
      const scripts = [];
      
      const replacer = (arr) => {
        return function (match, p1, p2, /* …, */ pN, offset, string, groups) {
        arr.push(p1);
        return '';
        }
      };

      const events = {};
      const fe = [];
      //string.match(new RegExp(/---\n/gm)).length
      
      const eventReplacer = (arr) => {
        return function (match, a,b,c) {
  
        let narray = string.slice(0, c).match(new RegExp(/---\n/gm));
          
        if (!Array.isArray(narray)) narray = [];
        const key = String(narray.length);
        
        if (!arr[key]) arr[key] = [];
        arr[key].push([a,b]);
        return '';
        }
      };

      const feReplacer = (fe, offset=0) => {
        return function (match, index) {
          const uid = match.slice(19 + offset,-1);
          fe.push(uid);
          return `<div id="slide-${uid}" class="slide-frontend-object"></div>`;
        }
      };
      
    
      string = string.replace('<dummy >', '').replace('</dummy>', '');

      //extract scripts
      
      string = string.replace(r.scripts, replacer(scripts));


      //extract events
      //console.log(string);
      string = string.replace(r.events, eventReplacer(events));
      //console.log(events);

      //extract FE objects
      string = string.replace(r.fe, feReplacer(fe));
      string = string.replace(r.feh, feReplacer(fe, 4));

      let previousSlide = false;

      deck.on( 'slidechanged', event => {
        // event.previousSlide, event.currentSlide, event.indexh, event.indexv
        const slide = event.indexh;
        console.log(slide);
        if (event.previousSlide == event.currentSlide) return;

        if (previousSlide !== false) {
          events[String(previousSlide)].forEach((el) => server.kernel.io.fire(el[0], slide - previousSlide, 'Left'));
          previousSlide = false;
        }

        //console.log(Object.keys(events).includes(String(slide)));
          if (Object.keys(events).includes(String(slide))) {
            //console.log(events[slide]);
            events[String(slide)].forEach((el) => server.kernel.io.fire(el[0], slide, el[1]));
            previousSlide = slide;
          }

      } );

      let blocked = false;

      const fragmentFire = (x,y) => {
        if (blocked) return;
        blocked = true;
        setTimeout(()=>{
          blocked = false;
        }, 100);
        events[String(x)].forEach((el) => server.kernel.io.fire(el[0], y, 'fragment-'+String(y+1)));
        console.log('fragment fire!');
       
      };



      deck.on( 'fragmentshown', event => {
        const state = deck.getState();
   
        if (Object.keys(events).includes(String(state.indexh))) {
          fragmentFire(state.indexh, state.indexf);
        }
      } );

      

      slides.innerHTML = unicodeToChar(string);
  
      
      
      this.deck = deck;

      
      this.uid = uuidv4();
      this.cnt = (cnt++);
      decks[this.uid] = deck;

      const runOverFe = async function () {
        for (const uid of fe) {

          const cuid = Date.now() + Math.floor(Math.random() * 10009);
          var global = {call: cuid};

          console.warn('loading executable on a slide...');
          //console.log(uid);
          //console.log(document.getElementById(`slide-${uid}`));
          
      
          let env = {global: global, element: document.getElementById(`slide-${uid}`)}; 
          console.log("Slides: creating an object");


          console.log('forntend executable');

          let obj;
          console.log('check cache');
          if (ObjectHashMap[uid]) {
              obj = ObjectHashMap[uid];
          } else {
              obj = new ObjectStorage(uid);
          }
          //console.log(obj);
      
          const copy = env;
          const store = await obj.get();
          const instance = new ExecutableObject('slides-static-'+uuidv4(), copy, store, true);
          instance.assignScope(copy);
          obj.assign(instance);
      
          await instance.execute();          
      
          self.envs.push(env);          
      }    };

    const startPresentation = () => {
      console.log('Start the presentation');
      deck.initialize().then(async (value) => {
        Array.from(value.srcElement.querySelectorAll("script")).forEach( oldScript => {
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes)
            .forEach( attr => newScript.setAttribute(attr.name, attr.value) );
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        await runModuleSnippetsInOrder(scripts);
    

        await runOverFe();
        //when everyhting is mounted. fire an event for the first slide
        //Mouted event
        for (const key of Object.keys(events)) {
          events[key].forEach((el) => server.kernel.io.fire(el[0], true, 'Mounted'));
        }

        self.events = events;

        //for the first slide

        if (Object.keys(events).includes(String(0))) {
          events[String(0)].forEach((el) => server.kernel.io.fire(el[0], 0, el[1]));
          previousSlide = 0;
        }

        setTimeout(() => {
          deck.layout();
        }, 100);
        
      });
    };

    //sideeffect

    //if mathjax needed
    if (JaxLoaded) {
      startPresentation();
    } else {
      //console.log('Test it');
      if (new RegExp(/data-eq-/gm).exec(data)) {
        JaxLoaded = true;
        
        import('./mathjaxsvg-2618f7c3.js').then(function (n) { return n.m; }).then(() => {
          console.log('Jax Loaded');
          startPresentation();
        });

      } else {
        startPresentation();
      }
    }

      

      return this;
    }
  }

  const codemirror = window.SupportedCells['codemirror'].context; 
  
  window.SupportedLanguages.push({
    check: (r) => {return(r[0] === '.slide' || r[0] === '.slides')},
    plugins: [codemirror.markdown(), codemirror.DropPasteHandlers(pasteDrop, pasteFile), codemirror.EditorView.editorAttributes.of({class: 'clang-slide'}), codemirror.EditorView.contentAttributes.of({ spellcheck: 'true' })],
    name: codemirror.markdownLanguage.name
  });

  

  window.SupportedCells['slide'] = {
    view: RevealJSCell,
    context: {decks: decks}
  };


  class RevealJSCellPrinted {
    envs = []
    events
    cnt
    
    constructor(parent, data) {
      const self = this;
      let deck = new _$1(parent.element, {
        embedded: true,
        keyboard: true,
        pdfMaxPagesPerSlide: 1,
        pdfSeparateFragments: true,
        // Optional function that blocks keyboard events when retuning false
        //
        // If you set this to 'focused', we will only capture keyboard events
        // for embedded decks when they are in focus
        keyboardCondition: null,
        slideNumber: true,
        plugins: [ Plugin, KaTeX /*, RevealDrawer(self)*/ ]
      } );

      const container = document.createElement('div');
      container.classList.add('reveal');

      const slides = document.createElement('div');
      slides.classList.add('slides');

      container.appendChild(slides);

      parent.element.appendChild(container);

      
      //if (!core._isWindow) parent.element.classList.add('reveal-fixed-height');
      //parent.element.classList.add('padding-fix');

      //parent.element.style.height = "500px";

      let string = `
      <section data-markdown>
      <textarea data-template>
          ${data}
      </textarea>
      </section>      
      `;

      const r = {
        scripts: new RegExp(/\<(?:[^:]+:)?script\>.*?\<\/(?:[^:]+:)?script\>/gm),
        events: new RegExp(/RVJSEvent\["([^"]+)","([^"]+)"\]/g),
        fe: new RegExp(/FrontEndExecutable\[([^\[|\]]+)\]/g),
        feh: new RegExp(/FrontEndExecutableHold\[([^\[|\]]+)\]/g)
      };
      
      const scripts = [];
      
      const replacer = (arr) => {
        return function (match, p1, p2, /* …, */ pN, offset, string, groups) {
        arr.push(match);
        return '';
        }
      };

      const events = {};
      const fe = [];
      //string.match(new RegExp(/---\n/gm)).length
      
      const eventReplacer = (arr) => {
        return function (match, a,b,c) {
  
        let narray = string.slice(0, c).match(new RegExp(/---\n/gm));
          
        if (!Array.isArray(narray)) narray = [];
        
        arr[narray.length] = [a,b];
        return '';
        }
      };

      const feReplacer = (fe, offset=0) => {
        return function (match, index) {
          const uid = match.slice(19 + offset,-1);
          fe.push(uid);
          return `<div id="slide-${uid}" class="slide-frontend-object"></div>`;
        }
      };
      
    
      string = string.replace('<dummy >', '').replace('</dummy>', '');

      //extract scripts
      
      string = string.replace(r.scripts, replacer(scripts));

      //extract events
      //console.log(string);
      string = string.replace(r.events, eventReplacer(events));
      //console.log(events);

      //extract FE objects
      string = string.replace(r.fe, feReplacer(fe));
      string = string.replace(r.feh, feReplacer(fe, 4));
      
      slides.innerHTML = unicodeToChar(string);
  

      const scriptHolder = document.createElement('div');
      parent.element.appendChild(scriptHolder);

      setInnerHTML(scriptHolder, scripts.join(''));
      
      this.deck = deck;

      
      this.uid = uuidv4();
      this.cnt = (cnt++);
      decks[this.uid] = deck;

      const runOverFe = async function () {
        for (const uid of fe) {

          const cuid = Date.now() + Math.floor(Math.random() * 10009);
          var global = {call: cuid};

          console.warn('loading executable on a slide...');
          //console.log(uid);
          //console.log(document.getElementById(`slide-${uid}`));
          
      
          let env = {global: global, element: document.getElementById(`slide-${uid}`)}; 
          console.log("Slides: creating an object");


          console.log('forntend executable');

          let obj;
          console.log('check cache');
          if (ObjectHashMap[uid]) {
              obj = ObjectHashMap[uid];
          } else {
              obj = new ObjectStorage(uid);
          }
          //console.log(obj);
      
          const copy = env;
          const store = await obj.get();
          const instance = new ExecutableObject('slides-stored-'+uuidv4(), copy, store, true);
          instance.assignScope(copy);
          obj.assign(instance);
      
          instance.execute();          
      
          self.envs.push(env);          
      }    };

    //sideeffect
      deck.initialize().then(async (value) => {
        Array.from(value.srcElement.querySelectorAll("script")).forEach( oldScript => {
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes)
            .forEach( attr => newScript.setAttribute(attr.name, attr.value) );
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        await runOverFe();
        self.events = events;
        setTimeout(() => {
          deck.layout();
        }, 100);
      });

      return this;
    }
  }  

  window.SupportedCells['printslide'] = {
    view: RevealJSCellPrinted
  };
