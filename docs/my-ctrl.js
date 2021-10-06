class MyCtrl {
  onAdd(map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.setAttribute("class", 'maplibregl-ctrl my-ctrl');

    this._map.on("load", () => {
      const html = ["<ul>"];
      this._map.getStyle().layers.filter(a => a.type === 'fill-extrusion').forEach(a => {
        const checked = a.layout.visibility === "visible" ? "checked" : "";
        html.push(`<li><input type='radio' name='voxel' value='${a.id}' ${checked} id='${a.id}'/><label for='${a.id}'>${a.id}</label></li>`)
      });
      this._map.getStyle().layers.filter(a => a.type === "fill-extrusion").forEach(a => {});
      html.push("</ul>");
      this._container.insertAdjacentHTML('afterbegin', html.join(""));

      Array.from(this._container.getElementsByTagName("input")).forEach(input => {
        input.addEventListener("change", () => this.onChange());
      });
    });
    return this._container;
  }
  onChange() {
    Array.from(this._container.getElementsByTagName("input")).forEach(input => {
      this._map.setLayoutProperty(input.value, "visibility", input.checked ? "visible" : "none");
    });
  }
  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
  getDefaultPosition() {
    return "top-right";
  }
}
