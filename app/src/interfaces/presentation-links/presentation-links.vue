<script setup lang="ts">
import { unexpectedError } from '@/utils/unexpected-error';
import { useApi } from '@directus/composables';
import { PrimaryKey } from '@directus/types';
import { getEndpoint, getFieldsFromTemplate } from '@directus/utils';
import { pickBy } from 'lodash';
import { render } from 'micromustache';
import { computed, inject, ref, toRefs, watch } from 'vue';

type Link = {
	icon: string;
	label: string;
	type: string;
	url?: string;
};

type ParsedLink = Omit<Link, 'url'> & {
	to?: string;
	href?: string;
};

const props = withDefaults(
	defineProps<{
		links: Link[];
		collection: string;
		primaryKey?: PrimaryKey;
	}>(),
	{
		links: () => [],
	},
);

const api = useApi();
const values = inject('values', ref<Record<string, any>>({}));
const resolvedRelationalValues = ref<Record<string, any>>({});
const { primaryKey } = toRefs(props);

watch(
	primaryKey,
	async (value) => {
		if (!value || value === '+') return;

		const relatedFieldsFromTemplates = getRelatedFieldsFromTemplates();
		if (relatedFieldsFromTemplates.length === 0) return;

		try {
			const response = await api.get(`${getEndpoint(props.collection)}/${value}`, {
				params: {
					fields: relatedFieldsFromTemplates,
				},
			});

			/*
			 * Pick only non-arrays because we can't render those types of relations.
			 * For example, a M2M relation would return an array.
			 */
			resolvedRelationalValues.value = pickBy(response.data.data, (value) => !Array.isArray(value));
		} catch (err) {
			unexpectedError(err);
		}
	},
	{ immediate: true },
);

const linksParsed = computed<ParsedLink[]>(() =>
	props.links.map((link) => {
		/*
		 * Resolve related fields for interpolation.
		 * If the values from v-form already include related fields,
		 * we use them because those represent the current unstaged edits.
		 * Otherwise we use the fetched values from the API.
		 */

		const scope = { ...values.value };

		Object.keys(resolvedRelationalValues.value).forEach((key) => {
			if (scope[key]?.constructor !== Object && scope[key] !== null) {
				scope[key] = resolvedRelationalValues.value[key];
			}
		});

		const interpolatedUrl = link.url ? render(link.url, scope) : '';

		/*
		 * This incorrectly matches new links starting with two slashes but(!)
		 * updating this line would change existing behavior.
		 */
		const isInternalLink = interpolatedUrl?.startsWith('/');

		return {
			icon: link.icon,
			type: link.type,
			label: link.label,
			to: isInternalLink ? interpolatedUrl : undefined,
			href: isInternalLink ? undefined : interpolatedUrl,
		};
	}),
);

/**
 * Get all deduplicated relational fields from the link-templates.
 * For example:
 * [ "related.field", "languages.code" ]
 */
function getRelatedFieldsFromTemplates() {
	const allFields = props.links?.flatMap((link) => (!link.url ? [] : getFieldsFromTemplate(link.url)));

	const deduplicatedFields = [...new Set(allFields)];

	const relationalFields = deduplicatedFields.filter((value) => value.includes('.'));

	return relationalFields;
}
</script>

<template>
	<div class="presentation-links">
		<v-button
			v-for="(link, index) in linksParsed"
			:key="index"
			class="action"
			:class="[link.type]"
			:secondary="link.type !== 'primary'"
			:icon="!link.label"
			:href="link.href"
			:to="link.to"
		>
			<v-icon v-if="link.icon" left :name="link.icon" />
			<span v-if="link.label">{{ link.label }}</span>
		</v-button>
	</div>
</template>

<style lang="scss" scoped>
.presentation-links {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.action {
	&.info {
		--v-button-background-color: var(--blue);
		--v-button-background-color-hover: var(--blue-125);
		--v-button-color: var(--blue-alt);
		--v-button-color-hover: var(--blue-alt);
	}

	&.success {
		--v-button-background-color: var(--theme--success);
		--v-button-background-color-hover: var(--success-125);
		--v-button-color: var(--success-alt);
		--v-button-color-hover: var(--success-alt);
	}

	&.warning {
		--v-button-background-color: var(--theme--warning);
		--v-button-background-color-hover: var(--warning-125);
		--v-button-color: var(--warning-alt);
		--v-button-color-hover: var(--warning-alt);
	}

	&.danger {
		--v-button-icon-color: var(--white);
		--v-button-background-color: var(--theme--danger);
		--v-button-background-color-hover: var(--danger-125);
		--v-button-color: var(--danger-alt);
		--v-button-color-hover: var(--danger-alt);
	}
}
</style>
