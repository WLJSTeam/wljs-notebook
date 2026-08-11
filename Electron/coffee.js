const {
  BaseWindow,
  ImageView,
  nativeImage,
  screen,
} = require('electron')
const path = require('path')

const DEFAULT_TIMEOUT_MS = 4000
const SLIDE_IN_DURATION_MS = 800
const SLIDE_OUT_DURATION_MS = 600
const EDGE_PADDING = 0
const COMPOSITOR_SETTLE_MS = 32

function asElectronInteger(value, fallback = 0) {
  const number = Number(value)
  const fallbackNumber = Number(fallback)

  const safeValue = Number.isFinite(number)
    ? number
    : Number.isFinite(fallbackNumber)
      ? fallbackNumber
      : 0

  const integer = Math.round(safeValue)

  // Normalize JavaScript's -0 before passing the value to Electron.
  return Object.is(integer, -0) ? 0 : integer
}


function showCoffeeSplash({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onClick = () => {
    
  },
  imageRef,
} = {}) {
  const splashImage = imageRef;

  if (splashImage.isEmpty()) {
    throw new Error(`Unable to load image`)
  }

  const { width, height } = splashImage.getSize()

  // Show it on the monitor where the mouse currently is.
  const display = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint()
  )

  const {
    x: screenX,
    y: screenY,
    width: screenWidth,
    height: screenHeight,
  } = display.workArea

  const edge = Math.random() < 0.5 ? 'left' : 'right'

  // Keep the entire image vertically inside the work area.
  const availableY = Math.max(0, screenHeight - height)
  const y = asElectronInteger(
    screenY + Math.floor(Math.random() * (availableY + 1)),
    screenY
  )

  // Completely outside the screen.
  const hiddenX = asElectronInteger(
    edge === 'left'
      ? screenX - width
      : screenX + screenWidth,
    screenX
  )

  // Fully visible and aligned with the selected edge.
  const visibleX = asElectronInteger(
    edge === 'left'
      ? screenX + EDGE_PADDING
      : screenX + screenWidth - width - EDGE_PADDING,
    screenX
  )

  const win = new BaseWindow({
    width,
    height,
    x: hiddenX,
    y,

    // Prevent the window from flashing at an incorrect position.
    show: false,

    // It must remain focusable because focus is used as the click signal.
    focusable: true,
    acceptFirstMouse: true,

    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    opacity: 0,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hiddenInMissionControl: true,
    alwaysOnTop: true,
  })

  const splashView = new ImageView()
  splashView.setImage(splashImage)
  splashView.setBackgroundColor('#00000000')
  splashView.setBounds({
    x: 0,
    y: 0,
    width,
    height,
  })

  win.setContentView(splashView)

  let destroyed = false
  let closing = false
  let dismissTimer = null
  let animationTimer = null
  let revealTimer = null
  let currentWindowX = hiddenX
  let currentWindowOpacity = 0

  function clearDismissTimer() {
    if (dismissTimer) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }
  }

  function clearAnimation() {
    if (animationTimer) {
      clearInterval(animationTimer)
      animationTimer = null
    }
  }

  function clearRevealTimer() {
    if (revealTimer !== null) {
      clearTimeout(revealTimer)
      revealTimer = null
    }
  }

  function safeDestroy() {
    if (destroyed) return

    destroyed = true
    clearDismissTimer()
    clearAnimation()
    clearRevealTimer()

    if (!win.isDestroyed()) {
      win.destroy()
    }
  }

  function setWindowX(value) {
    if (destroyed || win.isDestroyed()) return false

    const x = asElectronInteger(value, currentWindowX)

    try {
      win.setPosition(x, y)
      currentWindowX = x
      return true
    } catch (error) {
      // The native window can disappear between isDestroyed() and
      // setPosition(), particularly while the application is closing.
      if (!win.isDestroyed()) {
        console.error('Unable to position coffee splash:', {
          error,
          requestedX: value,
          resolvedX: x,
          y,
        })
      }

      safeDestroy()
      return false
    }
  }

  function setWindowOpacity(value) {
    if (destroyed || win.isDestroyed()) return false

    const numericValue = Number(value)
    const opacity = Number.isFinite(numericValue)
      ? Math.max(0, Math.min(1, numericValue))
      : currentWindowOpacity

    try {
      win.setOpacity(opacity)
      currentWindowOpacity = opacity
      return true
    } catch (error) {
      if (!win.isDestroyed()) {
        console.error('Unable to set coffee splash opacity:', {
          error,
          requestedOpacity: value,
          resolvedOpacity: opacity,
        })
      }

      safeDestroy()
      return false
    }
  }

  function animatePosition({
    fromX,
    toX,
    fromOpacity = currentWindowOpacity,
    toOpacity = currentWindowOpacity,
    duration,
    onComplete,
  }) {
    clearAnimation()

    const safeFromX = asElectronInteger(fromX, currentWindowX)
    const safeToX = asElectronInteger(toX, safeFromX)
    const safeFromOpacity = Math.max(0, Math.min(1, Number(fromOpacity)))
    const safeToOpacity = Math.max(0, Math.min(1, Number(toOpacity)))
    const numericDuration = Number(duration)
    const safeDuration =
      Number.isFinite(numericDuration) && numericDuration > 0
        ? numericDuration
        : 1

    currentWindowX = safeFromX
    const startedAt = Date.now()

    const timer = setInterval(() => {
      // Ignore a callback belonging to an animation that was replaced.
      if (animationTimer !== timer) {
        clearInterval(timer)
        return
      }

      if (destroyed || win.isDestroyed()) {
        clearAnimation()
        return
      }

      const elapsed = Date.now() - startedAt
      const progress = Math.min(1, elapsed / safeDuration)

      // Smooth cubic ease-out.
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const currentX =
        safeFromX + (safeToX - safeFromX) * easedProgress
      const currentOpacity =
        safeFromOpacity +
        (safeToOpacity - safeFromOpacity) * easedProgress

      if (!setWindowX(currentX)) return
      if (!setWindowOpacity(currentOpacity)) return

      if (progress >= 1) {
        clearAnimation()
        if (!setWindowX(safeToX)) return
        if (!setWindowOpacity(safeToOpacity)) return
        onComplete?.()
      }
    }, 16)

    animationTimer = timer
  }

  function slideOutAndDestroy() {
    if (closing || destroyed || win.isDestroyed()) return

    closing = true
    clearDismissTimer()

    animatePosition({
      fromX: currentWindowX,
      toX: hiddenX,
      fromOpacity: currentWindowOpacity,
      toOpacity: 0,
      duration: SLIDE_OUT_DURATION_MS,
      onComplete: safeDestroy,
    })
  }

  // ImageView has no direct click event. Clicking the inactive window
  // gives it focus, which is used as the click signal.
  win.once('focus', () => {
    if (closing || destroyed) return

    try {
      onClick()
    } finally {
      slideOutAndDestroy()
    }
  })

  win.once('closed', () => {
    destroyed = true
    clearDismissTimer()
    clearAnimation()
    clearRevealTimer()
  })

  // The window is already positioned outside the screen. Show it without
  // stealing focus and begin sliding it into view.
  win.showInactive()
  setWindowX(hiddenX)

  // Give the native transparent surface a moment to be composited while it
  // is still invisible. This prevents a one-frame flash on first display.
  revealTimer = setTimeout(() => {
    revealTimer = null

    if (destroyed || win.isDestroyed()) return

    animatePosition({
      fromX: hiddenX,
      toX: visibleX,
      fromOpacity: 0,
      toOpacity: 1,
      duration: SLIDE_IN_DURATION_MS,
      onComplete: () => {
        // Start counting only after the cup is fully visible.
        dismissTimer = setTimeout(
          slideOutAndDestroy,
          timeoutMs
        )
      },
    })
  }, COMPOSITOR_SETTLE_MS)

  return win
}

module.exports = {
  showCoffeeSplash,
}
