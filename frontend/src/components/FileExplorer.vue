<template>
	<v-card>
		<v-card-title>{{ header }}</v-card-title>
		<v-card-text>
			<v-text-field label="Path" v-model="editingPath" @change="direct()"></v-text-field>
			<v-list class="scrolling-list file-explorer-list">
				<v-list-item-group>
					<v-list-item
						v-for="file in connection.directory.files"
						:key="file.path"
						max-height="10"
						@click="file.isDirectory ? navigate(file.path) : getFile(file.path)"
					>
						<v-list-item-avatar class="ma-0" height="20">
							<v-icon
								small
								:color="file.isDirectory ? 'orange' : 'grey'"
							>{{ file.isDirectory ? "mdi-folder" : "mdi-file" }}</v-icon>
						</v-list-item-avatar>
						<v-list-item-title>{{ file.name }}</v-list-item-title>
						<v-list-item-action v-if="!file.isDirectory">
							<v-btn small fab text @click="unlink(file.path)" @mousedown.stop @touchstart.native.stop>
								<v-icon>mdi-delete</v-icon>
							</v-btn>
						</v-list-item-action>
					</v-list-item>
				</v-list-item-group>
			</v-list>
		</v-card-text>
		<v-card-actions>
			<v-spacer></v-spacer>
			<v-btn fab text small @click="uploadFileDialog = true">
				<v-icon>mdi-upload</v-icon>
			</v-btn>
		</v-card-actions>
		<v-dialog v-model="uploadFileDialog" max-width="400">
			<v-card>
				<v-card-title primary-title>Upload file</v-card-title>
				<v-card-text>
					<input type="file" accept="*" multiple="false" ref="uploadFile" />
				</v-card-text>
				<v-card-actions>
					<v-progress-circular indeterminate v-if="uploading" color="primary"></v-progress-circular>
					<v-spacer></v-spacer>
					<v-btn text @click="upload()">upload</v-btn>
					<v-btn text @click="uploadFileDialog = false">close</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-card>
</template>

<script lang="ts">
	import { requestDirectory, IConnection, getFile, putFile, unlink } from "../connections"

	import Vue from 'vue'
	export default Vue.extend({
		name: "FileExplorer",
		data: () => ({
			path: "",
			editingPath: "",
			uploadFileDialog: false,
			uploading: false
		}),
		props: {
			connection: Object as () => IConnection,
			header: {
				type: String,
				default: "File Explorer"
			}
		},
		watch: {
			connection: {
				immediate: true,
				deep: true,
				handler() {
					if (this.path != this.connection.directory.path) {
						this.editingPath = this.path = this.connection.directory.path
					}
				}
			}
		},
		methods: {
			navigate(folder: string) {
				requestDirectory(this.connection, folder)
			},
			direct() {
				requestDirectory(this.connection, this.editingPath)
			},
			getFile(path: string) {
				getFile(this.connection, path)
			},
			upload() {
				var input = this.$refs.uploadFile as HTMLInputElement
				var file = input?.files?.[0]

				if (file) {
					this.uploading = true

					var reader = new FileReader()

					reader.addEventListener("load", () => {
						this.uploading = false
						this.uploadFileDialog = false

						let result = reader.result

						if (result instanceof ArrayBuffer) {
							// Won't happen
						} else {
							putFile(this.connection, this.path + "/" + file!.name, result!)
						}
					})

					reader.readAsText(file)
				} else {
					this.uploadFileDialog = false
				}
			},
			unlink(path: string) {
				unlink(this.connection, path)
			}
		}
	})
</script>