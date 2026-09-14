<!-- 编辑 HTTP Headers -->

<template>
  <section class="http-header-config">
    <section class="header-title">
      <el-text>{{ type }} Header</el-text>
      <section class="btns">
        <el-button
          text
          type="danger"
          :icon="Delete"
          @click="delete_all_headers"
        ></el-button>
      </section>
    </section>

    <section class="header-panel">
      <el-table :data="current_headers" border>
        <el-table-column prop="on" label="On" width="50" :resizable="false">
          <template #default="{ row }">
            <check-button v-model="row.on" @click="row.on = !row.on" />
          </template>
        </el-table-column>

        <!-- @vue-generic {HttpHeader} -->
        <el-table-column prop="key" label="Key">
          <template #default="{ row }">
            <el-select
              v-model="row.key"
              filterable
              allow-create
              default-first-option
              :placeholder="type + ' header key'"
            >
              <template #prefix>
                <tool-tip
                  v-if="is_append_warning(row)"
                  content="This header key cannot be appended"
                >
                  <el-icon>
                    <el-icon color="var(--el-color-warning)">
                      <Warning />
                    </el-icon>
                  </el-icon>
                </tool-tip>
                <el-icon v-else><EditPen /></el-icon>
              </template>
              <el-option
                v-for="item in http_headers_lists"
                :key="item.value"
                :label="item.value"
                :value="item.value"
              />
            </el-select>
          </template>
        </el-table-column>

        <!-- Operation -->
        <!-- @vue-generic {HttpHeader} -->
        <el-table-column
          prop="operation"
          label="Operation"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <fake-component>
              <template #fake>
                <el-tag
                  :type="tag_type_map[row.operation]"
                  :disable-transitions="true"
                  class="fake-elem-text"
                >
                  {{ row.operation }}
                </el-tag>
              </template>
              <template #real>
                <el-select v-model="row.operation" size="small">
                  <el-option
                    v-for="item in header_options"
                    :key="item"
                    :label="item"
                    :value="item"
                  />
                </el-select>
              </template>
            </fake-component>
          </template>
        </el-table-column>

        <!-- @vue-generic {HttpHeader} -->
        <el-table-column prop="value" label="Value" :resizable="false">
          <template #default="{ row }">
            <el-input
              v-model="row.value"
              :prefix-icon="EditPen"
              :disabled="row.operation === 'remove'"
              :placeholder="type + ' header value'"
              clearable
            ></el-input>
          </template>
        </el-table-column>

        <!-- Delete  -->
        <el-table-column width="60" :resizable="false">
          <template #default="{ $index }">
            <el-button
              text
              bg
              type="danger"
              size="small"
              :icon="Close"
              @click="delete_header($index)"
            ></el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="header-footer">
      <el-button
        text
        bg
        type="primary"
        style="width: 100%"
        @click="add_header"
        :icon="Plus"
      >
        Add Empty Header
      </el-button>
    </section>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import checkButton from "./check-button.vue";
import fakeComponent from "./fake-component.vue";
import ToolTip from "./tool-tip.vue";
import { Close, Delete, EditPen, Plus, Warning } from "@element-plus/icons-vue";

type Props = {
  type?: "Request" | "Response";
  headers?: HttpHeader[];
};

const props = withDefaults(defineProps<Props>(), {
  type: "Request",
  headers: () => [],
});

// ====================================================

const current_headers = ref<HttpHeader[]>(props.headers);

const header_options: HttpHeader["operation"][] = ["append", "set", "remove"];
const tag_type_map: Record<
  HttpHeader["operation"],
  "warning" | "success" | "danger"
> = {
  append: "warning",
  set: "success",
  remove: "danger",
};

/** Last Updated 2026-06-17. https://www.iana.org/assignments/http-fields/http-fields.xhtml */
const http_headers_lists = Object.freeze([
  {
    value: "A-IM",
  },
  {
    value: "Accept",
  },
  {
    value: "Accept-Additions",
  },
  {
    value: "Accept-CH",
  },
  {
    value: "Accept-Datetime",
  },
  {
    value: "Accept-Encoding",
  },
  {
    value: "Accept-Features",
  },
  {
    value: "Accept-Language",
  },
  {
    value: "Accept-Patch",
  },
  {
    value: "Accept-Post",
  },
  {
    value: "Accept-Query",
  },
  {
    value: "Accept-Ranges",
  },
  {
    value: "Accept-Signature",
  },
  {
    value: "Access-Control-Allow-Credentials",
  },
  {
    value: "Access-Control-Allow-Headers",
  },
  {
    value: "Access-Control-Allow-Methods",
  },
  {
    value: "Access-Control-Allow-Origin",
  },
  {
    value: "Access-Control-Expose-Headers",
  },
  {
    value: "Access-Control-Max-Age",
  },
  {
    value: "Access-Control-Request-Headers",
  },
  {
    value: "Access-Control-Request-Method",
  },
  {
    value: "Age",
  },
  {
    value: "Allow",
  },
  {
    value: "ALPN",
  },
  {
    value: "Alt-Svc",
  },
  {
    value: "Alt-Used",
  },
  {
    value: "Alternates",
  },
  {
    value: "Apply-To-Redirect-Ref",
  },
  {
    value: "Authentication-Control",
  },
  {
    value: "Authentication-Info",
  },
  {
    value: "Authorization",
  },
  {
    value: "Available-Dictionary",
  },
  {
    value: "Cache-Control",
  },
  {
    value: "Cache-Group-Invalidation",
  },
  {
    value: "Cache-Groups",
  },
  {
    value: "Cache-Status",
  },
  {
    value: "Cal-Managed-ID",
  },
  {
    value: "CalDAV-Timezones",
  },
  {
    value: "Capsule-Protocol",
  },
  {
    value: "CDN-Cache-Control",
  },
  {
    value: "CDN-Loop",
  },
  {
    value: "Cert-Not-After",
  },
  {
    value: "Cert-Not-Before",
  },
  {
    value: "Clear-Site-Data",
  },
  {
    value: "Client-Cert",
  },
  {
    value: "Client-Cert-Chain",
  },
  {
    value: "Close",
  },
  {
    value: "Concealed-Auth-Export",
  },
  {
    value: "Connection",
  },
  {
    value: "Content-Digest",
  },
  {
    value: "Content-Disposition",
  },
  {
    value: "Content-Encoding",
  },
  {
    value: "Content-Language",
  },
  {
    value: "Content-Length",
  },
  {
    value: "Content-Location",
  },
  {
    value: "Content-Range",
  },
  {
    value: "Content-Security-Policy",
  },
  {
    value: "Content-Security-Policy-Report-Only",
  },
  {
    value: "Content-Type",
  },
  {
    value: "Cookie",
  },
  {
    value: "Cross-Origin-Embedder-Policy",
  },
  {
    value: "Cross-Origin-Embedder-Policy-Report-Only",
  },
  {
    value: "Cross-Origin-Opener-Policy",
  },
  {
    value: "Cross-Origin-Opener-Policy-Report-Only",
  },
  {
    value: "Cross-Origin-Resource-Policy",
  },
  {
    value: "DASL",
  },
  {
    value: "Date",
  },
  {
    value: "DAV",
  },
  {
    value: "Delta-Base",
  },
  {
    value: "Deprecation",
  },
  {
    value: "Depth",
  },
  {
    value: "Destination",
  },
  {
    value: "Detached-JWS",
  },
  {
    value: "Dictionary-ID",
  },
  {
    value: "DPoP",
  },
  {
    value: "DPoP-Nonce",
  },
  {
    value: "Early-Data",
  },
  {
    value: "ETag",
  },
  {
    value: "Expect",
  },
  {
    value: "Expires",
  },
  {
    value: "Forwarded",
  },
  {
    value: "From",
  },
  {
    value: "Hobareg",
  },
  {
    value: "Host",
  },
  {
    value: "If",
  },
  {
    value: "If-Match",
  },
  {
    value: "If-Modified-Since",
  },
  {
    value: "If-None-Match",
  },
  {
    value: "If-Range",
  },
  {
    value: "If-Schedule-Tag-Match",
  },
  {
    value: "If-Unmodified-Since",
  },
  {
    value: "IM",
  },
  {
    value: "Include-Referred-Token-Binding-ID",
  },
  {
    value: "Incremental",
  },
  {
    value: "Keep-Alive",
  },
  {
    value: "Label",
  },
  {
    value: "Last-Event-ID",
  },
  {
    value: "Last-Modified",
  },
  {
    value: "Link",
  },
  {
    value: "Link-Template",
  },
  {
    value: "Location",
  },
  {
    value: "Lock-Token",
  },
  {
    value: "Max-Forwards",
  },
  {
    value: "Memento-Datetime",
  },
  {
    value: "Meter",
  },
  {
    value: "MIME-Version",
  },
  {
    value: "Negotiate",
  },
  {
    value: "NEL",
  },
  {
    value: "OData-EntityId",
  },
  {
    value: "OData-Isolation",
  },
  {
    value: "OData-MaxVersion",
  },
  {
    value: "OData-Version",
  },
  {
    value: "Optional-WWW-Authenticate",
  },
  {
    value: "Ordering-Type",
  },
  {
    value: "Origin",
  },
  {
    value: "Origin-Agent-Cluster",
  },
  {
    value: "OSCORE",
  },
  {
    value: "OSLC-Core-Version",
  },
  {
    value: "Overwrite",
  },
  {
    value: "Ping-From",
  },
  {
    value: "Ping-To",
  },
  {
    value: "Position",
  },
  {
    value: "Prefer",
  },
  {
    value: "Preference-Applied",
  },
  {
    value: "Priority",
  },
  {
    value: "Proxy-Authenticate",
  },
  {
    value: "Proxy-Authentication-Info",
  },
  {
    value: "Proxy-Authorization",
  },
  {
    value: "Proxy-Status",
  },
  {
    value: "Public-Key-Pins",
  },
  {
    value: "Public-Key-Pins-Report-Only",
  },
  {
    value: "Range",
  },
  {
    value: "Redirect-Ref",
  },
  {
    value: "Referer",
  },
  {
    value: "Referrer-Policy",
  },
  {
    value: "Refresh",
  },
  {
    value: "Replay-Nonce",
  },
  {
    value: "Repr-Digest",
  },
  {
    value: "Retry-After",
  },
  {
    value: "Schedule-Reply",
  },
  {
    value: "Schedule-Tag",
  },
  {
    value: "Sec-Fetch-Dest",
  },
  {
    value: "Sec-Fetch-Mode",
  },
  {
    value: "Sec-Fetch-Site",
  },
  {
    value: "Sec-Fetch-User",
  },
  {
    value: "Sec-Purpose",
  },
  {
    value: "Sec-Token-Binding",
  },
  {
    value: "Sec-WebSocket-Accept",
  },
  {
    value: "Sec-WebSocket-Extensions",
  },
  {
    value: "Sec-WebSocket-Key",
  },
  {
    value: "Sec-WebSocket-Protocol",
  },
  {
    value: "Sec-WebSocket-Version",
  },
  {
    value: "Server",
  },
  {
    value: "Server-Timing",
  },
  {
    value: "Set-Cookie",
  },
  {
    value: "Set-Txn",
  },
  {
    value: "Signature",
  },
  {
    value: "Signature-Input",
  },
  {
    value: "SLUG",
  },
  {
    value: "SoapAction",
  },
  {
    value: "Status-URI",
  },
  {
    value: "Strict-Transport-Security",
  },
  {
    value: "Sunset",
  },
  {
    value: "TCN",
  },
  {
    value: "TE",
  },
  {
    value: "Timeout",
  },
  {
    value: "Topic",
  },
  {
    value: "Traceparent",
  },
  {
    value: "Tracestate",
  },
  {
    value: "Trailer",
  },
  {
    value: "Transfer-Encoding",
  },
  {
    value: "TTL",
  },
  {
    value: "Upgrade",
  },
  {
    value: "Urgency",
  },
  {
    value: "Use-As-Dictionary",
  },
  {
    value: "User-Agent",
  },
  {
    value: "Variant-Vary",
  },
  {
    value: "Vary",
  },
  {
    value: "Via",
  },
  {
    value: "Want-Content-Digest",
  },
  {
    value: "Want-Repr-Digest",
  },
  {
    value: "WWW-Authenticate",
  },
  {
    value: "X-Content-Type-Options",
  },
  {
    value: "X-Frame-Options",
  },
]);

/** https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/ModifyHeaderInfo#%E6%A0%87%E5%A4%B4%E9%99%90%E5%88%B6 */
const can_append_headers = Object.freeze(
  new Set([
    "Accept",
    "Accept-Encoding",
    "Accept-Language",
    "Access-Control-Request-Headers",
    "Cache-Control",
    "Connection",
    "Content-Language",
    "Cookie",
    "Forwarded",
    "If-Match",
    "If-None-Match",
    "Keep-Alive",
    "Range",
    "Te",
    "Trailer",
    "Transfer-Encoding",
    "Upgrade",
    "Via",
    "Want-Digest",
    "X-Forwarded-For",
  ]),
);

function is_append_warning(h: HttpHeader) {
  return h.operation === "append" && !can_append_headers.has(h.key);
}

function delete_header(index: number) {
  current_headers.value.splice(index, 1);
}

function delete_all_headers() {
  current_headers.value = [];
}

function add_header() {
  current_headers.value.push({
    on: false,
    operation: "set",
    key: "",
    value: "",
  });
}
</script>

<style scoped>
:deep(.el-select__wrapper),
:deep(.el-input__wrapper) {
  box-shadow: none !important;
  background: none !important;
}

.http-header-config {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  > section {
    width: 100%;
  }

  .header-title {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .el-text {
      color: var(--cure-idol);
    }
  }
}
</style>
