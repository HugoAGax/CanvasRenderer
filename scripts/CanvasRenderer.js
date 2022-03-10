class CanvasRenderer {
  constructor(config) {
    this.$canvas = config.$canvas;
    this.viewport = config.viewport;
    this._origin = [0, 0, 0];
    this.spheres = config.spheres;
    this.lights = config.lights;
    this.background_color = [255, 255, 255];
  }

  init() {
    this._c_width = this.$canvas.width;
    this._c_height = this.$canvas.height;
    this._c_ctx = this.$canvas.getContext("2d");
    this._c_buffer = this._c_ctx.getImageData(
      0,
      0,
      this.$canvas.width,
      this.$canvas.height
    );
    this._c_pitch = this._c_buffer.width * 4;
    console.log(this);
    return this;
  }

  render() {
    for (let x = -this._c_height / 2; x < this._c_height / 2; x++) {
      for (let y = -this._c_height / 2; y < this._c_height / 2; y++) {
        let direction = this.canvasToViewport([x, y]);
        let color = this.traceRay(this._origin, direction, 0, Infinity);
        this.paintPixel(x, y, this.clamp(color));
      }
    }
    this._updateCanvas();
  }

  canvasToViewport(point) {
    return [
      (point[0] * this.viewport.sizeX) / this._c_width,
      (point[1] * this.viewport.sizeY) / this._c_height,
      this.viewport.distance,
    ];
  }

  _updateCanvas() {
    this._c_ctx.putImageData(this._c_buffer, 0, 0);
  }

  paintPixel(x, y, color) {
    x = this._c_width / 2 + x;
    y = this._c_height / 2 - y - 1;

    if (x < 0 || x >= this._c_width || y < 0 || y >= this._c_height) {
      return;
    }

    var offset = 4 * x + this._c_pitch * y;
    this._c_buffer.data[offset++] = color[0];
    this._c_buffer.data[offset++] = color[1];
    this._c_buffer.data[offset++] = color[2];
    this._c_buffer.data[offset++] = 255;
  }

  traceRay(origin, direction, travelMin, travelMax) {
    let canvasRenderer = this;
    let closestTravel = Infinity;
    let closestSphere = null;
    this.spheres.forEach((sphere) => {
      let ts = canvasRenderer.intersectRaySphere(origin, direction, sphere);
      if (travelMin <= ts[0] && ts[0] <= travelMax && ts[0] < closestTravel) {
        closestTravel = ts[0];
        closestSphere = sphere;
      }
      if (travelMin <= ts[1] && ts[1] <= travelMax && ts[1] < closestTravel) {
        closestTravel = ts[1];
        closestSphere = sphere;
      }
    });
    if (closestSphere === null) {
      return this.background_color;
    }

    var point = this.add(origin, this.multiply(closestTravel, direction));
    var normal = this.subtract(point, closestSphere.center);
    normal = this.multiply(1.0 / this.magnitude(normal), normal);

    return this.multiply(this.computeLighting(point, normal), closestSphere.color)
  }

  intersectRaySphere(origin, direction, sphere) {
    let r = sphere.radius;
    let originToCenter = this.subtract(origin, sphere.center);
    let a = this.dotProduct(direction, direction);
    let b = 2 * this.dotProduct(originToCenter, direction);
    let c = this.dotProduct(originToCenter, originToCenter) - r * r;
    let discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return Infinity, Infinity;
    }

    let t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    let t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    
    return [t1, t2];
  }

  dotProduct (v1, v2) {
    return v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
  }
  
  subtract (v1, v2) {
    return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
  }

  multiply (k, v) {
    return [k * v[0], k * v[1], k * v[2]];
  }

  add (v1, v2) {
    return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
  }
  
  magnitude (v) {
    return Math.sqrt(this.dotProduct(v, v));
  }

  clamp (vec) {
    return [Math.min(255, Math.max(0, vec[0])),
        Math.min(255, Math.max(0, vec[1])),
        Math.min(255, Math.max(0, vec[2]))];
  }

  computeLighting(point, normal) {
    let i = 0;
    const canvasRenderer = this;
    this.lights.forEach((light) => {
      let lightV = [];
      if (light.type === 'ambient') {
        i += light.intensity; 
      } else {
        if (light.type === 'point') {
          lightV = canvasRenderer.subtract(light.pos, point);
        } else {
          lightV = light.pos;
        }
        let dotNL = canvasRenderer.dotProduct(normal, lightV);
        if (dotNL > 0) {
          i += light.intensity * dotNL / canvasRenderer.magnitude(lightV);
        }
      }
    });
    return i;
  }
}
