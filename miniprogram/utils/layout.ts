interface LayoutInfo {
  statusBarHeight: number
  navBarHeight: number
  navBarContentHeight: number
  safeAreaBottom: number
  windowHeight: number
  screenWidth: number
  menuButtonRight: number
  menuButtonLeft: number
  menuButtonTop: number
  menuButtonHeight: number
  headerPaddingTop: number
  headerPaddingRight: number
}

let _layout: LayoutInfo | null = null

export function getLayout(): LayoutInfo {
  if (_layout) return _layout

  const sys = wx.getSystemInfoSync()
  const menuButton = wx.getMenuButtonBoundingClientRect()

  const statusBarHeight = sys.statusBarHeight || 0
  const navBarContentHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height
  const navBarHeight = statusBarHeight + navBarContentHeight
  const safeAreaBottom = sys.screenHeight - (sys.safeArea?.bottom || sys.screenHeight)
  const screenWidth = sys.screenWidth

  const menuButtonRight = menuButton.right
  const menuButtonLeft = menuButton.left
  const headerPaddingRight = screenWidth - menuButtonLeft + 8

  _layout = {
    statusBarHeight,
    navBarHeight,
    navBarContentHeight,
    safeAreaBottom,
    windowHeight: sys.windowHeight,
    screenWidth,
    menuButtonRight,
    menuButtonLeft,
    menuButtonTop: menuButton.top,
    menuButtonHeight: menuButton.height,
    headerPaddingTop: statusBarHeight + 8,
    headerPaddingRight,
  }

  return _layout
}
