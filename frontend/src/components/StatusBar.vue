<template>
  <span class="status-badge" :class="`status-${status}`" :style="customStyle">
    <f7-icon 
      v-if="showIcon" 
      :size="iconSize" 
      :color="iconColor"
      :class="{ 'spinning': status === 'processing' }"
    >
      {{ statusIcon }}
    </f7-icon>
    <span class="status-text">{{ statusText }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => ['pending', 'processing', 'completed', 'error'].includes(value)
  },
  compact: {
    type: Boolean,
    default: false
  },
  showIcon: {
    type: Boolean,
    default: true
  },
  customLabels: {
    type: Object,
    default: () => ({})
  },
  iconSize: {
    type: Number,
    default: 14
  }
})

// Computed
const statusText = computed(() => {
  const defaultLabels = {
    pending: 'Pendente',
    processing: 'Em Análise',
    completed: 'Processado',
    error: 'Erro'
  }
  
  return props.customLabels[props.status] || defaultLabels[props.status]
})

const statusIcon = computed(() => {
  const icons = {
    pending: 'clock',
    processing: 'arrow_clockwise',
    completed: 'checkmark_circle',
    error: 'exclamationmark_triangle'
  }
  
  return icons[props.status] || 'circle'
})

const iconColor = computed(() => {
  const colors = {
    pending: 'warning',
    processing: 'blue',
    completed: 'green',
    error: 'red'
  }
  
  return colors[props.status] || 'gray'
})

const customStyle = computed(() => {
  const baseStyle = {}
  
  if (props.compact) {
    baseStyle.padding = '4px 8px'
    baseStyle.fontSize = '11px'
  }
  
  return baseStyle
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

/* Status: Pending */
.status-pending {
  background: rgba(255, 152, 0, 0.15);
  color: #F57C00;
}

/* Status: Processing */
.status-processing {
  background: rgba(33, 150, 243, 0.15);
  color: #1976D2;
}

/* Status: Completed */
.status-completed {
  background: rgba(76, 175, 80, 0.15);
  color: #388E3C;
}

/* Status: Error */
.status-error {
  background: rgba(244, 67, 54, 0.15);
  color: #D32F2F;
}

/* Spinning Icon */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Status Text */
.status-text {
  line-height: 1;
}

/* Tema Escuro */
:global(.theme-dark) .status-pending {
  background: rgba(255, 152, 0, 0.25);
  color: #FFB74D;
}

:global(.theme-dark) .status-processing {
  background: rgba(33, 150, 243, 0.25);
  color: #64B5F6;
}

:global(.theme-dark) .status-completed {
  background: rgba(76, 175, 80, 0.25);
  color: #81C784;
}

:global(.theme-dark) .status-error {
  background: rgba(244, 67, 54, 0.25);
  color: #E57373;
}
</style>
