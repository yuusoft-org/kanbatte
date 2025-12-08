import { createWebPatch } from '@rettangoli/fe';
import { h } from 'snabbdom/build/h';

const componentDependencies = {
}

const pageDependencies = {
}

const deps = {
  components: componentDependencies,
  pages: pageDependencies,
}

const patch = createWebPatch();

export {
  h,
  patch,
  deps,
}
