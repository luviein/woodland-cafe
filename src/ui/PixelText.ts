import Phaser from 'phaser';

/** Native-resolution glyphs with solid pixel edges, scoped to retro panels. */
export class PixelText extends Phaser.GameObjects.Text {
  override updateText(): this {
    super.updateText();
    if (!this.canvas.width || !this.canvas.height) return this;
    const pixels = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    // Browser font rasterisation leaves faint edge pixels. Snap coverage once
    // after drawing, rather than increasing resolution or blurring the texture.
    for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = pixels.data[i] >= 72 ? 255 : 0;
    this.context.putImageData(pixels, 0, 0);
    const renderer = this.scene.sys.game.renderer;
    if ('gl' in renderer) {
      this.frame.source.glTexture = renderer.canvasToTexture(this.canvas, this.frame.source.glTexture ?? undefined, true);
    }
    return this;
  }
}
