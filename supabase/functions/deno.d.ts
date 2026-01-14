/// <reference types="https://deno.land/x/types/index.d.ts" />

declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}
