// Fixed elements from index.html. Modules load deferred, so the DOM is ready here.
const byId = (id) => document.getElementById(id);

export const dom = {
  app: byId('app'),
  modal: byId('modal'),
  tip: byId('tooltip'),
  top: byId('top-screen'),
  hud: byId('ov-hud'),
  world: byId('ov-world'),
  float: byId('ov-float'),
  msg: byId('msgbox'),
};
