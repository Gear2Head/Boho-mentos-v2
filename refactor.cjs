const { Project, SyntaxKind } = require('ts-morph');
const project = new Project();
project.addSourceFilesAtPaths('src/store/appStore.ts');
const sourceFile = project.getSourceFile('src/store/appStore.ts');

// 1. Remove Supabase imports
sourceFile.getImportDeclarations().forEach(imp => {
    if (imp.getModuleSpecifierValue() === '../services/supabaseSync') {
        imp.remove();
    }
});

// Add Firebase imports
sourceFile.addImportDeclarations([
    {
        namedImports: ['doc', 'setDoc', 'deleteDoc'],
        moduleSpecifier: 'firebase/firestore'
    },
    {
        namedImports: ['db'],
        moduleSpecifier: '../services/firebase'
    }
]);

// Find all statements to remove/replace
const callsToRemove = [];
const tombstoneCalls = [];
const pushSingleCalls = [];
const pushCalls = [];

sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
    const exprText = call.getExpression().getText();
    if (exprText === 'recordEloActivity') {
        const stmt = call.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
        if (stmt) callsToRemove.push(stmt);
    } else if (exprText === 'tombstoneEntityInSupabase') {
        tombstoneCalls.push(call);
    } else if (exprText === 'pushSingleEntityToSupabase') {
        pushSingleCalls.push(call);
    } else if (exprText === 'pushToSupabase') {
        pushCalls.push(call);
    }
});

// Remove nodes backwards or replace
callsToRemove.reverse().forEach(stmt => {
    if (!stmt.wasForgotten()) stmt.remove();
});

tombstoneCalls.reverse().forEach(call => {
    if (call.wasForgotten()) return;
    const args = call.getArguments().map(a => a.getText());
    call.replaceWithText(`deleteDoc(doc(db, 'users', ${args[0]}, ${args[1]}, ${args[2]})).catch(console.error)`);
});

pushSingleCalls.reverse().forEach(call => {
    if (call.wasForgotten()) return;
    const args = call.getArguments().map(a => a.getText());
    const itemText = args[2].split(' as ')[0];
    call.replaceWithText(`setDoc(doc(db, 'users', ${args[0]}, ${args[1]}, ${itemText}.id), ${itemText}).catch(console.error)`);
});

pushCalls.reverse().forEach(call => {
    const parent = call.getParentIfKind(SyntaxKind.ExpressionStatement);
    if (!parent || parent.wasForgotten()) return;
    const args = call.getArguments();
    if (args.length >= 2) {
        const uid = args[0].getText();
        let payloadBytes = args[1].getText();
        if (payloadBytes.includes(' as ')) {
            payloadBytes = payloadBytes.split(' as ')[0];
        }
        const replacement = `setDoc(doc(db, 'users', ${uid}), ${payloadBytes}, { merge: true }).catch(console.error)`;
        const voidParent = parent.getText().startsWith('void') ? parent : call;
        voidParent.replaceWithText(replacement);
    }
});

sourceFile.getDescendantsOfKind(SyntaxKind.VoidExpression).forEach(node => {
     if (node.wasForgotten()) return;
     if (node.getExpression().getExpression && node.getExpression().getExpression().getText() === 'pushToSupabase') {
          const call = node.getExpression();
          const args = call.getArguments();
          if (args.length >= 2) {
              const uid = args[0].getText();
              let payloadBytes = args[1].getText();
              if (payloadBytes.includes(' as ')) {
                  payloadBytes = payloadBytes.split(' as ')[0];
              }
              const replacement = `setDoc(doc(db, 'users', ${uid}), ${payloadBytes}, { merge: true }).catch(console.error)`;
              node.replaceWithText(replacement);
          }
     }
});

project.saveSync();
console.log('Refactoring complete.');
