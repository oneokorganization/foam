var fs = require('fs');

CLASS({
  name: 'JSONFileDAO',

  extendsModel: 'MDAO',

  properties: [
    {
      name:  'name',
      label: 'File Name',
      model_: 'StringProperty',
      defaultValueFn: function() {
        return this.model.plural + '.json';
      }
    }
  ],

  methods: {
    init: function() {
      this.SUPER();

      if ( fs.existsSync(this.name) ) {
        var content = fs.readFileSync(this.name, { encoding: 'utf-8' });
        JSONUtil.parse(this.X, content).select(this);
      }

      this.addRawIndex({
        execute: function() {},
        bulkLoad: function() {},
        toString: function() { return "JSONFileDAO Update"; },
        plan: function() {
          return { cost: Number.MAX_VALUE };
        },
        put: this.updated,
        remove: this.updated
      });
    }
  },

  listeners: [
    {
      name: 'updated',
      isMerged: 100,
      code: function() {
        this.select()(function(a) {
          fs.writeFileSync(this.name, JSONUtil.where(NOT_TRANSIENT).stringify(a), { encoding: 'utf-8' });
        }.bind(this));
      }
    }
  ]
});


CLASS({
  name: 'XMLFileDAO',

  extendsModel: 'MDAO',

  properties: [
    {
      name:  'name',
      label: 'File Name',
      model_: 'StringProperty',
      defaultValueFn: function() {
        return this.model.plural + '.xml';
      }
    }
  ],

  methods: {
    init: function() {
      this.SUPER();

      if ( fs.existsSync(this.name) ) {
        var content = fs.readFileSync(this.name, { encoding: 'utf-8' });
        XMLUtil.parse(content).select(this);
      } else {
        console.warn('XMLFileDAO could not find file "' + this.name + '"');
      }

      this.addRawIndex({
        execute: function() {},
        bulkLoad: function() {},
        toString: function() { return "XMLFileDAO Update"; },
        plan: function() {
          return { cost: Number.MAX_VALUE };
        },
        put: this.updated,
        remove: this.updated
      });
    }
  },

  listeners: [
    {
      name: 'updated',
      isMerged: 100,
      code: function() {
        this.select()(function(a) {
          fs.writeFileSync(this.name, XMLUtil.stringify(a), { encoding: 'utf-8' });
        }.bind(this));
      }
    }
  ]
});

