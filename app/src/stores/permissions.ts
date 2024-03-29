import api from '@/api';
import { parseFilter } from '@/utils/parse-filter';
import { parsePreset } from '@/utils/parse-preset';
import { Permission, PermissionsAction } from '@directus/types';
import { deepMap } from '@directus/utils';
import { defineStore } from 'pinia';
import { useUserStore } from '../stores/user';

export const usePermissionsStore = defineStore({
	id: 'permissionsStore',
	state: () => ({
		permissions: [] as Permission[],
	}),
	actions: {
		async hydrate() {
			const userStore = useUserStore();

			const response = await api.get('/permissions', {
				params: { filter: { role: { _eq: userStore.currentUser!.role.id } } },
			});

			const fields = getNestedDynamicVariableFields(response.data.data);

			if (fields.length > 0) {
				await userStore.hydrateAdditionalFields(fields);
			}

			this.permissions = response.data.data.map((rawPermission: Permission) => {
				if (rawPermission.permissions) {
					rawPermission.permissions = parseFilter(rawPermission.permissions);
				}

				if (rawPermission.validation) {
					rawPermission.validation = parseFilter(rawPermission.validation);
				}

				if (rawPermission.presets) {
					rawPermission.presets = parsePreset(rawPermission.presets);
				}

				return rawPermission;
			});

			function getNestedDynamicVariableFields(rawPermissions: Permission[]) {
				const fields = new Set<string>();

				const checkDynamicVariable = (value: string) => {
					if (typeof value !== 'string') return;

					if (value.startsWith('$CURRENT_USER.')) {
						fields.add(value.replace('$CURRENT_USER.', ''));
					} else if (value.startsWith('$CURRENT_ROLE.')) {
						fields.add(value.replace('$CURRENT_ROLE.', 'role.'));
					}
				};

				rawPermissions.forEach((rawPermission: Permission) => {
					deepMap(rawPermission.presets, checkDynamicVariable);
					deepMap(rawPermission.permissions, checkDynamicVariable);
				});

				return Array.from(fields);
			}
		},
		dehydrate() {
			this.$reset();
		},
		getPermission(collection: string, action: PermissionsAction) {
			const permission = this.permissions.find(
				(permission) => permission.action === action && permission.collection === collection,
			);

			return permission || null;
		},
		hasPermission(collection: string, action: PermissionsAction) {
			const userStore = useUserStore();

			if (userStore.isAdmin) return true;

			return this.permissions.some(
				(permission) => permission.action === action && permission.collection === collection,
			);
		},
	},
});
