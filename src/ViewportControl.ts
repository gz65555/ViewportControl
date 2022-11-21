import { Canvas, Entity, Keys, Matrix, PointerButton, Script, Vector2, Vector3 } from "oasis-engine";
import { Spherical } from "./Spherical";

const forwardVec3 = new Vector3(0, 0, -0.1);
const backwardVec3 = new Vector3(0, 0, 0.1);
const leftVec3 = new Vector3(-0.1, 0, 0);
const rightVec3 = new Vector3(0.1, 0, 0);
const upVec3 = new Vector3(0, -0.1, 0);
const downVec3 = new Vector3(0, 0.1, 0);
const _tempVec3 = new Vector3();
const _targetMoveVector3 = new Vector3();

export class ViewportControl extends Script {
  /** The minimum radian in the vertical direction, the default is 1 degree. */
  minPolarAngle: number = 1;
  /** The maximum radian in the vertical direction,  the default is 179 degree.  */
  maxPolarAngle: number = (179 / 180) * Math.PI;
  /**  The minimum distance, the default is 0.1, should be greater than 0. */
  minDistance: number = 0.1;
  /** The maximum distance, the default is infinite, should be greater than the minimum distance. */
  maxDistance: number = Infinity;
  /** The minimum radian in the horizontal direction, the default is negative infinity. */
  minAzimuthAngle: number = -Infinity;
  /** The maximum radian in the horizontal direction, the default is positive infinity.  */
  maxAzimuthAngle: number = Infinity;
  /** Rotation speed, default is 1.0 . */
  rotateSpeed: number = 1.0;
  /** Camera zoom speed, the default is 1.0. */
  zoomSpeed: number = 1.0;
  private _atTheBack: boolean = false;
  private _spherical: Spherical = new Spherical();
  private _sphericalDelta: Spherical = new Spherical();
  private _zoomFrag: number = 0;
  private _target = new Vector3();
  private _up: Vector3 = new Vector3(0, 1, 0);
  private _scale: number = 1;
  private canvas: Canvas;

  constructor(entity: Entity) {
    super(entity);
    this.canvas = this.engine.canvas;
    this._spherical.setYAxis(this._up);
  }

  onUpdate() {
    // this.entity
    const inputManager = this._engine.inputManager;
    if (
      inputManager.isKeyHeldDown(Keys.AltLeft) &&
      inputManager.isKeyHeldDown(Keys.KeyS)
    ) {
      this._move(backwardVec3);
    } else if (
      inputManager.isKeyHeldDown(Keys.AltLeft) &&
      inputManager.isKeyHeldDown(Keys.KeyW)
    ) {
      this._move(forwardVec3);
    }

    if (
      inputManager.isKeyHeldDown(Keys.AltLeft) &&
      inputManager.isKeyHeldDown(Keys.KeyA)
    ) {
      this._move(leftVec3);
    } else if (
      inputManager.isKeyHeldDown(Keys.AltLeft) &&
      inputManager.isKeyHeldDown(Keys.KeyD)
    ) {
      this._move(rightVec3);
    }

    if (
      inputManager.isKeyHeldDown(Keys.AltLeft) &&
      inputManager.isKeyHeldDown(Keys.KeyQ)
    ) {
      this._move(upVec3);
    } else if (
      inputManager.isKeyHeldDown(Keys.AltLeft) &&
      inputManager.isKeyHeldDown(Keys.KeyE)
    ) {
      this._move(downVec3);
    }

    const wheelDelta = inputManager.wheelDelta;
    if (wheelDelta && wheelDelta.y !== 0) {
      const delta = wheelDelta.y;
      if (delta > 0) {
        this._scale /= Math.pow(0.95, this.zoomSpeed);
      } else if (delta < 0) {
        this._scale *= Math.pow(0.95, this.zoomSpeed);
      }
    }

    if (
      inputManager.isKeyHeldDown(Keys.AltLeft) &&
      inputManager.isPointerHeldDown(PointerButton.Primary)
    ) {
      const { pointers } = inputManager;
      const { deltaPosition } = pointers[0];
      const radianLeft =
        ((2 * Math.PI * deltaPosition.x) / this.canvas.width) *
        this.rotateSpeed;
      this._sphericalDelta.theta -= radianLeft;
      const radianUp =
        ((2 * Math.PI * deltaPosition.y) / this.canvas.height) *
        this.rotateSpeed;
      this._sphericalDelta.phi -= radianUp;
    }

    this._updateTransform();
  }

  private _move(vec: Vector3) {
    const entityTransform = this.entity.transform;
    entityTransform.translate(vec);

    Vector3.transformByQuat(vec, entityTransform.worldRotationQuaternion, _targetMoveVector3);

    this._target.add(_targetMoveVector3);
  }

  private _updateTransform(): void {
    const cameraTransform = this.entity.transform;
    const { _target: target, _spherical, _sphericalDelta } = this;
    Vector3.subtract(cameraTransform.position, target, _tempVec3);
    _spherical.setFromVec3(_tempVec3, this._atTheBack);
    _spherical.theta += _sphericalDelta.theta;
    _spherical.phi += _sphericalDelta.phi;
    _spherical.theta = Math.max(
      this.minAzimuthAngle,
      Math.min(this.maxAzimuthAngle, _spherical.theta)
    );
    _spherical.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, _spherical.phi)
    );
    _spherical.makeSafe();
    if (this._scale !== 1) {
      this._zoomFrag = _spherical.radius * (this._scale - 1);
    }
    _spherical.radius += this._zoomFrag;
    _spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, _spherical.radius)
    );
    this._atTheBack = _spherical.setToVec3(_tempVec3);
    Vector3.add(target, _tempVec3, cameraTransform.worldPosition);
    cameraTransform.lookAt(
      target,
      _tempVec3.copyFrom(this._up).scale(this._atTheBack ? -1 : 1)
    );
    /** Reset cache value. */
    this._zoomFrag = 0;
    this._scale = 1;
    _sphericalDelta.set(0, 0, 0);
  }
}
