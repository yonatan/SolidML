/**
 * @file Extention for three.js. SolidMLBUfferGeometry.js depends on three.js and SolidML.js. Import after these dependent files.
 */
/**
 *  THREE.BufferGeometry constructed by {@link SolidML}. SolidMLBUfferGeometry.js depends on three.js and SolidML.js. Import after these dependent files.
 *  @extends {THREE.BufferGeometry}
 */
SolidML.BufferGeometry = class extends THREE.BufferGeometry {
  /** THREE.BufferGeometry constructed by {@link SolidML} script.
   *  @param {string} [script] script to construct object. call {@link SolidML.BufferGeometry#build} inside.
   *  @param {Object.<BufferGeometry>} [geometryHash] hash map of original geometries and keys in script.
   *  @param {object} [criteria] default criteria of this structure, specified by "set *" commands in script.
   */
  constructor(script=null, geometryHash=null, criteria=null) {
    super();
    /** 
     *  vertex count, is equals to BufferGeometry.attributes.position.count after build()
     *  @type {int}
     */
    this.vertexCount = 0;
    /** 
     *  index count, is equals to BufferGeometry.index.count after build()
     *  @type {int}
     */
    this.indexCount = 0;
    /** 
     *  object count
     *  @type {int}
     */
    this.objectCount = 0;
    /** 
     * hash map of functions return the geometry gemerated by parameter (written as "label[param]") and option (written as "label:option") 
     * @type {object.<Function>}
     */
    this.geometryCreator = new SolidML.GeometryCreator(geometryHash);
    /** 
     *  {@link SolidML} instance to construct object.
     *  @type {SolidML}
     */
    this.solidML = null;
    // private
    this._vertexIndex = 0;
    this._indexIndex = 0;
    if (script) this.build(script, criteria);
  }
  /** construct object by script. execute {@link SolidML.BufferGeometry#compile}=>{@link SolidML.BufferGeometry#estimateBufferCount}=>{@link SolidML.BufferGeometry#allocVertexBuffer}=>{@link SolidML.BufferGeometry#update} inside
   *  @param {string} script script to construct object. 
   *  @param {object} [criteria] default criteria of this structure, specified by "set *" commands in script.
   *  @param {boolean} [isDynamic] set THREE.BufferAttribute.dynamic
   *  @return {SolidML.BufferGeometry} this instance
   */
  build(script, criteria=null, isDynamic=false) {
    this.compile(script, criteria);
    this.estimateBufferCount();
    this.allocBuffers(isDynamic);
    this.update();
    return this;
  }
  /** Parse script, make a structure of recursive calls inside.
   *  @param {string} script script to construct object. 
   *  @param {object} [criteria] default criteria of this structure, specified by "set *" commands in script.
   *  @return {SolidML.BufferGeometry} this instance
   */
  compile(script, criteria=null) {
    this.solidML = new SolidML(script, criteria);
    return this;
  }
  /** estimate index, vertex and object count with some margins. Counted values are set at {@link SolidML.BufferGeometry.indexCount}, {@link SolidML.BufferGeometry.vertexCount} and {@link SolidML.BufferGeometry.objectCount}.
   *  @param {int} [indexMargin] margin for index buffer, added to requierd index buffer count
   *  @param {int} [vertexMargin] margin for vertex buffer, added to requierd vertex buffer count
   *  @return {SolidML.BufferGeometry} this instance
   */
  estimateBufferCount(indexMargin=0, vertexMargin=0) {
    this.indexCount = indexMargin;
    this.vertexCount = vertexMargin;
    this.objectCount = 0;
    this.geometryCreator.setup();
    this.solidML.build(stat=>{
      const geomComposed = this.geometryCreator.compose(stat);
      if (geomComposed) {
        stat.color._incrementRandMT();
        this.indexCount += geomComposed.index.array.length;
        this.vertexCount += geomComposed.attributes.position.count;
        this.objectCount++;
      }
      const geomCreated = this.geometryCreator.create(stat);
      if (geomCreated) {
        stat.color._incrementRandMT();
        this.indexCount += geomCreated.index.array.length;
        this.vertexCount += geomCreated.attributes.position.count;
        this.objectCount++;
      }
    });
    return this;
  }
  /** allocate index buffer and vertex buffer
   *  @param {boolean} [isDynamic] set THREE.BufferAttribute.dynamic
   *  @param {int} [indexCount] index buffer size. pass 0 to allocate by {@link SolidML.BufferGeometry.indexCount} estimated by {@link SolidML.BufferGeometry#estimateBufferCount}
   *  @param {int} [vertexCount] vertex buffer size. pass 0 to allocate by {@link SolidML.BufferGeometry.vertexCount} estimated by {@link SolidML.BufferGeometry#estimateBufferCount}
   *  @return {SolidML.BufferGeometry} this instance
   */
  allocBuffers(isDynamic=true, indexCount=0, vertexCount=0) {
    if (indexCount  > 0) this.indexCount  = indexCount;
    if (vertexCount > 0) this.vertexCount = vertexCount;
    this._indices = new Uint32Array(this.indexCount);
    this._positions = new Float32Array(this.vertexCount * 3);
    this._normals = new Float32Array(this.vertexCount * 3);
    this._colors = new Float32Array(this.vertexCount * 4);
    this.setIndex(new THREE.BufferAttribute(this._indices, 1).setDynamic(isDynamic));
    this.addAttribute('position', new THREE.BufferAttribute(this._positions, 3).setDynamic(isDynamic));
    this.addAttribute('normal', new THREE.BufferAttribute(this._normals, 3).setDynamic(isDynamic));
    this.addAttribute('color', new THREE.BufferAttribute(this._colors, 4).setDynamic(isDynamic));
    return this;
  }
  /** update vertex buffer and send data to gpu.
   *  @return {SolidML.BufferGeometry} this instance
   */
  update() {
    this._indexIndex = 0;
    this._vertexIndex = 0;
    this.geometryCreator.setup();
    this.solidML.build(stat=>{
      this._copyGeometory(stat, this.geometryCreator.compose(stat), false);
      this._copyGeometory(stat, this.geometryCreator.create(stat), true);
    });
    return this;
  }
  _copyGeometory(stat, geom, applyMatrix) {
    if (!geom) return;
    const vcount = geom.attributes.position.count,
          icount = geom.index.array.length;
    if (applyMatrix) {
      stat.matrix._applyToSrc_copyToDst(
        geom.attributes.position.array, vcount, 
        this.attributes.position.array, this._vertexIndex, 3);
      stat.matrix._applyToSrc_copyToDst(
        geom.attributes.normal.array, vcount,
        this.attributes.normal.array, this._vertexIndex, 3);
    } else {
      this.attributes.position.array.set(geom.attributes.position.array, this._vertexIndex*3);
      this.attributes.normal  .array.set(geom.attributes.normal  .array, this._vertexIndex*3);
    }
    stat.color._fillArray(this.attributes.color.array, this._vertexIndex, vcount);
    for (let i=0; i<icount; i++, this._indexIndex++) 
      this.index.array[this._indexIndex] = geom.index.array[i] + this._vertexIndex;
    this._vertexIndex += vcount;
  }
}
SolidML.GeometryCreator = class {
  constructor(geometryHash) {
    // generate hash map
    const indexing = geom=>{
      const indices = new Uint16Array(geom.attributes.position.count);
      for (let i=0; i<indices.length; i++)
        indices[i] = i;
      geom.setIndex(new THREE.BufferAttribute(indices, 1));
      return geom;
    };
    this.rotz = new THREE.Matrix4().makeRotationZ(-Math.PI/2),
    this.roty = new THREE.Matrix4().makeRotationY(Math.PI/2);
    // geometry hash
    this._geometryHash = Object.assign({
      "box":      new THREE.BoxBufferGeometry(1, 1, 1), 
      "sphere":   new THREE.SphereBufferGeometry(0.5, 8, 6), 
      "cylinder": new THREE.CylinderBufferGeometry(0.5, 0.5, 1, 8).applyMatrix(this.rotz), 
      "cone":     new THREE.ConeBufferGeometry(0.5, 1, 8).applyMatrix(this.rotz), 
      "torus":    new THREE.TorusBufferGeometry(0.5, 0.1, 4, 8).applyMatrix(this.roty), 
      "tetra":    indexing(new THREE.TetrahedronBufferGeometry(0.5)), 
      "octa":     indexing(new THREE.OctahedronBufferGeometry(0.5)), 
      "dodeca":   indexing(new THREE.DodecahedronBufferGeometry(0.5)), 
      "icosa":    indexing(new THREE.IcosahedronBufferGeometry(0.5)), 
      "grid":     null, 
      "line":     null, 
      "point":    null, 
      "tube":     null, 
      "mesh":     null
    }, geometryHash);
    // cahce area
    this._cache = {
      "sphere":   [],
      "cylinder": [],
      "cone":     [],
      "torus":    {},
      "triangle": {}
    };
    // creator functions
    this._creatorFunctions = {
      "sphere":   this._sphereCreator.bind(this),
      "cylinder": this._cylinderCreator.bind(this),
      "cone":     this._coneCreator.bind(this),
      "torus":    this._torusCreator.bind(this),
      "triangle": this._triangleCreator.bind(this)
    };
    // composer functions
    this._composerFunctions = {
      "mesh": this._meshComposer.bind(this),
      "tube": this._tubeComposer.bind(this)
    };
  }
  setup() {
    this._previousLabel = null;
    this._previousInfo = null;
    this._vertexStac = [];
  }
  create(stat) {
    return (stat.label in this._creatorFunctions && (!(stat.label in this._geometryHash) || stat.param || stat.option)) ?
           this._creatorFunctions[stat.label](stat) : this._geometryHash[stat.label];
  }
  compose(stat) {
    const prevLabel = this._previousLabel;
    this._previousLabel = stat.label;
    if ((prevLabel in this._composerFunctions) && prevLabel != stat.label) 
      return this._composerFunctions[prevLabel](stat, true);
    return (stat.label in this._composerFunctions) ? this._composerFunctions[stat.label](stat, false) : null;
  }
  finalize() {
    if (this._previousInfo && (this._previousLabel in this._composerFunctions)) 
      return this._composerFunctions[this._previousLabel](null, true);
    return null;
  }
  _sphereCreator(stat) {
    let segment = Number(stat.option[0])>>0;
    if (!segment || segment<3) segment = 8;
    return this._cache.sphere[segment] || (this._cache.sphere[segment] = new THREE.SphereBufferGeometry(0.5, segment, segment));
  }
  _cylinderCreator(stat) {
    let segment = Number(stat.option[0])>>0;
    if (!segment || segment<3) segment = 8;
    return this._cache.cylinder[segment] || (this._cache.cylinder[segment] = new THREE.CylinderBufferGeometry(0.5, 0.5, 1, segment).applyMatrix(this.rotz));
  }
  _coneCreator(stat) {
    let segment = Number(stat.option[0])>>0;
    if (!segment || segment<3) segment = 8;
    return this._cache.cone[segment] || (this._cache.cone[segment] = new THREE.ConeBufferGeometry(0.5, 1, segment).applyMatrix(this.rotz));
  }
  _torusCreator(stat) {
    if (stat.param in this._cache.torus) 
      return this._cache.torus[stat.param];
    const p = stat.param.split(/[\s,;:]/).map(s=>Number(s)||0);
    const tube = p[0] || 0.1;
    const radseg = (!p[1] || p[1]<3) ? 4 : p[1];
    const tubseg = (!p[2] || p[2]<3) ? 8 : p[2];
    const geom = new THREE.TorusBufferGeometry(0.5, tube, radseg, tubseg).applyMatrix(this.roty);
    this._cache.torus[stat.param] = geom;
    return geom;
  }
  _triangleCreator(stat) {
    if (stat.param in this._cache.triangle) 
      return this._cache.triangle[stat.param];
    const p = stat.param.split(/[\s,;:]/).map(s=>Number(s)||0);
    if (p.length > 9) p.length = 9;
    const n = new THREE.Vector3().set(vertex[3]-vertex[0], vertex[4]-vertex[1], vertex[5]-vertex[2]);
    n.cross(  new THREE.Vector3().set(vertex[6]-vertex[0], vertex[7]-vertex[1], vertex[8]-vertex[2])).nize();
    const vertex = new Float32Array(9);
    vertex.set(p);
    const normal = new Float32Array([n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z]);
    const geom = new THREE.BufferGeometry();
    geom.setIndex(new THREE.Uint16BufferAttribute([0,1,2], 1));
    geom.addAttribute('position', new THREE.BufferAttribute(vertex, 3));
    geom.addAttribute('normal',   new THREE.BufferAttribute(normal, 3));
    this._cache.triangle[stat.param] = geom;
    return geom;
  }
  _meshComposer(stat, composeAll) {
    if (composeAll && this._previousInfo) {
      // calculate last vertices
      const pv0 = this._previousInfo.v0,
            pvy = this._previousInfo.vy.applyQuaternion(this._previousInfo.qrt),
            pvz = this._previousInfo.vz.applyQuaternion(this._previousInfo.qrt);
      this._vertexStac.push(pvy.clone().add(pv0), pvz.clone().add(pv0), pvy.negate().add(pv0), pvz.negate().add(pv0));
      this._previousInfo = null;
      // create face
      const vmax = this._vertexStac.length;
      const fmax = vmax - 4;
      const indexBuffer = new Uint16Array(fmax*6);
      const face = (iface, ivertex, ioff)=>{
        const ioff2 = (ioff + 1) & 3;
        indexBuffer[iface*6]   = ivertex+ioff;
        indexBuffer[iface*6+1] = ivertex+ioff2;
        indexBuffer[iface*6+2] = ivertex+ioff2+4;
        indexBuffer[iface*6+3] = ivertex+ioff;
        indexBuffer[iface*6+4] = ivertex+ioff2+4;
        indexBuffer[iface*6+5] = ivertex+ioff+4;
      };
      for (let i=0; i<fmax; i+=4) {
        face(i, i, 0);
        face(i+1, i+vmax, 1);
        face(i+2, i, 2);
        face(i+3, i+vmax, 3);
      }
      this._vertexStac = this._vertexStac.concat(this._vertexStac);
      // create geometory
      const geom = new THREE.BufferGeometry();
      geom.setIndex(new THREE.BufferAttribute(indexBuffer, 1));
      geom.addAttribute('position', new THREE.BufferAttribute(new Float32Array(this._vertexStac.length*3), 3).copyVector3sArray(this._vertexStac));
      geom.addAttribute('normal',   new THREE.BufferAttribute(new Float32Array(this._vertexStac.length*3), 3));
      geom.computeVertexNormals();
      return geom;
    }
    // calculate vertices
    const me  = stat.matrix.elements,
          v0 = new THREE.Vector3(me[12]/me[15], me[13]/me[15], me[14]/me[15]),
          vx = new THREE.Vector3(me[0], me[1], me[2]),
          vy = new THREE.Vector3(me[4]*0.707, me[5]*0.707, me[6]*0.707),
          vz = new THREE.Vector3(me[8]*0.707, me[9]*0.707, me[10]*0.707),
          qrt = new THREE.Quaternion();
    if (this._previousInfo) {
      const pv0 = this._previousInfo.v0,
            dir = new THREE.Vector3().subVectors(v0, pv0).normalize();
      qrt.setFromUnitVectors(this._previousInfo.vx.normalize(), dir);
      const pvy = this._previousInfo.vy.applyQuaternion(qrt),
            pvz = this._previousInfo.vz.applyQuaternion(qrt);
      this._vertexStac.push(pvy.clone().add(pv0), pvz.clone().add(pv0), pvy.negate().add(pv0), pvz.negate().add(pv0));
    }
    this._previousInfo = {v0, vx, vy, vz, qrt};
    return null;
  }
  _tubeComposer() {
    return null;
  }
}

