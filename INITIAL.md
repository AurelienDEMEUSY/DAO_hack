
Error with Permissions-Policy header: Unrecognized feature: 'browsing-topics'.
installHook.js:1 Phantom was registered as a Standard Wallet. The Wallet Adapter for Phantom can be removed from your app.
installHook.js:1 Phantom was registered as a Standard Wallet. The Wallet Adapter for Phantom can be removed from your app.
react-dom-client.development.js:5528 Uncaught Error: Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <AnchorProvider>
      <div className="min-h-scre...">
        <Navbar>
          <nav className="border-b b...">
            <div className="container ...">
              <div className="flex h-16 ...">
                <div>
                <div className="wallet-ada...">
                  <WalletMultiButton>
                    <BaseWalletMultiButton labels={{...}}>
                      <div className="wallet-ada...">
                        <BaseWalletConnectionButton aria-expanded={false} style={{...}} onClick={function onClick} ...>
                          <Button aria-expanded={false} style={{...}} onClick={function onClick} ...>
                            <button className="wallet-ada..." disabled={undefined} style={{...}} ...>
+                             <i className="wallet-adapter-button-start-icon">
-                             Select Wallet
                              ...
                        ...
        ...
      ...

    at throwOnHydrationMismatch (react-dom-client.development.js:5528:11)
    at beginWork (react-dom-client.development.js:12383:17)
    at runWithFiberInDEV (react-dom-client.development.js:984:30)
    at performUnitOfWork (react-dom-client.development.js:18995:22)
    at workLoopConcurrentByScheduler (react-dom-client.development.js:18989:9)
    at renderRootConcurrent (react-dom-client.development.js:18971:15)
    at performWorkOnRoot (react-dom-client.development.js:17832:11)
    at performWorkOnRootViaSchedulerTask (react-dom-client.development.js:20382:7)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:45:48)
forward-logs-shared.ts:95 [HMR] connected
forward-logs-shared.ts:95 [Fast Refresh] rebuilding
forward-logs-shared.ts:95 [Fast Refresh] done in 103ms
forward-logs-shared.ts:95 [Fast Refresh] rebuilding
forward-logs-shared.ts:95 [Fast Refresh] done in 392ms
forward-logs-shared.ts:95 [Fast Refresh] rebuilding
forward-logs-shared.ts:95 [Fast Refresh] done in 160ms
content_script.js:1 Uncaught TypeError: Cannot read properties of undefined (reading 'control')
    at content_script.js:1:422999
    at Array.some (<anonymous>)
    at shouldOfferCompletionListForField (content_script.js:1:422984)
    at elementWasFocused (content_script.js:1:423712)
    at HTMLDocument.focusInEventHandler (content_script.js:1:423069)
content_script.js:1 Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'control')
    at content_script.js:1:422999
    at Array.some (<anonymous>)
    at shouldOfferCompletionListForField (content_script.js:1:422984)
    at processInputEvent (content_script.js:1:426332)
content_script.js:1 Uncaught TypeError: Cannot read properties of undefined (reading 'control')
    at content_script.js:1:422999
    at Array.some (<anonymous>)
    at shouldOfferCompletionListForField (content_script.js:1:422984)
    at elementWasFocused (content_script.js:1:423712)
    at HTMLDocument.focusInEventHandler (content_script.js:1:423069)
2
content_script.js:1 Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'control')
    at content_script.js:1:422999
    at Array.some (<anonymous>)
    at shouldOfferCompletionListForField (content_script.js:1:422984)
    at processInputEvent (content_script.js:1:426332)
content_script.js:1 Uncaught TypeError: Cannot read properties of undefined (reading 'control')
    at content_script.js:1:422999
    at Array.some (<anonymous>)
    at shouldOfferCompletionListForField (content_script.js:1:422984)
    at elementWasFocused (content_script.js:1:423712)
    at HTMLDocument.focusInEventHandler (content_script.js:1:423069)
4
content_script.js:1 Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'control')
    at content_script.js:1:422999
    at Array.some (<anonymous>)
    at shouldOfferCompletionListForField (content_script.js:1:422984)
    at processInputEvent (content_script.js:1:426332)
installHook.js:1 Error creating event: AnchorError: AnchorError thrown in programs/dao/src/lib.rs:105. Error Code: DaoShutdown. Error Number: 6000. Error Message: DAO is frozen: less than 3 active members.
    at async useDao.useCallback[createEvent] (useDao.ts:168:20)
    at async handleCreateEvent (page.tsx:67:7)
