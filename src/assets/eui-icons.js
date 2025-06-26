// This file imports EUI icons that are used in the application
// to ensure they are included in the production build

import { appendIconComponentCache } from "@elastic/eui/es/components/icon/icon";

// Import the icons we're using
import { icon as arrowDown } from "@elastic/eui/es/components/icon/assets/arrow_down";
import { icon as arrowRight } from "@elastic/eui/es/components/icon/assets/arrow_right";
import { icon as plusInCircle } from "@elastic/eui/es/components/icon/assets/plus_in_circle";
import { icon as download } from "@elastic/eui/es/components/icon/assets/download";
import { icon as importAction } from "@elastic/eui/es/components/icon/assets/import";

// Register the icons with EUI
appendIconComponentCache({
  arrowDown,
  arrowRight,
  plusInCircle,
  download,
  import: importAction,
});
