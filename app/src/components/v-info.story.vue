<script setup lang="ts">
import VInfo from './v-info.vue';

function initState() {
	return {
		title: 'No More Cookies',
		icon: 'cookie',
	};
}
</script>

<template>
	<Story title="VInfo" :init-state="initState">
		<template #default="{ state: { _hPropState, _hPropDefs, $data: _, ...state } }">
			<v-info v-bind="state">You have sadly eaten all the cookies!</v-info>
		</template>
	</Story>
</template>
