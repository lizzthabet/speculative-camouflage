import * as p5 from "p5";

const max_size = 70;
const min_size = 30;
let counter = min_size;
let grow = true;

let x = 0;
let y = 0;

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    x = p.width / 2;
    y = p.height / 2;
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  p.draw = () => {
    console.log("I will not be included in production!");

    p.background(51);
    x = p.lerp(x, p.mouseX, 0.1);
    y = p.lerp(y, p.mouseY, 0.1);
    if (
      (counter < max_size && counter > max_size - 1) ||
      (counter > min_size && counter < min_size + 1)
    ) {
      grow = !grow;
    }

    p.circle(x, y, counter);

    if (grow) {
      counter = p.lerp(counter, max_size, 0.05);
    } else {
      counter = p.lerp(counter, min_size, 0.05);
    }
  };
};

new p5(sketch);
