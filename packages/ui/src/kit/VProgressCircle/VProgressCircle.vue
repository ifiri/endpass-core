<template>
  <field-atom
    class="v-progress-circle"
    :class="themeCssClass"
  >
    <svg class="v-progress-circle-back">
      <circle
        :r="r"
        :cx="cx"
        :cy="cy"
      />
    </svg>
    <svg
      class="v-progress-circle-over"
      :style="{ strokeDasharray: strokeDasharray }"
    >
      <circle
        :r="r"
        :cx="cx"
        :cy="cy"
        :stroke="stroke"
      />
    </svg>
    <span
      v-if="isLabelVisible"
      class="v-progress-circle-text"
    >
      {{ progressText }}
    </span>
  </field-atom>
</template>

<script>
import ThemeMixin from '@/mixins/ThemeMixin';
import FieldAtom from '@/atom/field-atom/field-atom';

const SIZE_DEFAULT_STROKE = 188.4;

export default {
  name: 'VProgressCircle',

  props: {
    progress: {
      type: [Number, String],
      default: 0,
    },
    isLabelVisible: {
      type: Boolean,
      default: false,
    },
    r: {
      type: String,
      default: '30px',
    },
    cx: {
      type: String,
      default: '41px',
    },
    cy: {
      type: String,
      default: '41px',
    },
    stroke: {
      type: String,
      default: '#6e32c9',
    },
  },

  computed: {
    strokeDasharray() {
      const toStroke = Math.floor(
        (this.progress - 0) * (SIZE_DEFAULT_STROKE / 100),
      );

      return `${toStroke}, ${SIZE_DEFAULT_STROKE}`;
    },

    progressText() {
      return `${this.progress}%`;
    },
  },

  mixins: [ThemeMixin],

  components: {
    FieldAtom,
  },
};
</script>