export function createUserManagement(ctx){const {auth,db,units,el,getDocFromServer,getDocsFromServer,doc,collection,setDoc,serverTimestamp}=ctx;
function pendingDeleteButton(uid,email){const b=document.createElement("button");b.type="button";b.className="action";b.style.cssText="width:auto;color:#b91c1c;border-color:#efb4b4";b.textContent="Excluir cadastro";const actor=auth.currentUser?.uid;const ref=doc(db,"registration_delete_requests",uid);const refresh=async()=>{try{const snap=await getDocFromServer(ref);if(!b.isConnected||actor!==auth.currentUser?.uid)return;const state=snap.data()?.status;if(state==="queued"){b.disabled=true;b.textContent="Exclusão em processamento";}else if(state==="deleted"){b.disabled=true;b.textContent="Exclusão concluída — atualize a lista";}else if(state==="protected"){b.disabled=true;b.textContent="Conta protegida — exclusão recusada";}}catch(e){if(b.isConnected)b.title="Não foi possível consultar o status da exclusão";}};b.onclick=async()=>{if(!b.isConnected||actor!==auth.currentUser?.uid||!email)return;if(!confirm("Excluir definitivamente o cadastro pendente de "+email+"? A ficha do apartamento será preservada."))return;b.disabled=true;try{const existing=await getDocFromServer(ref);if(!existing.exists())await setDoc(ref,{email,status:"queued",requestedBy:actor,requestedAt:serverTimestamp()});b.textContent="Exclusão solicitada — aguardando servidor";await refresh();}catch(e){b.textContent="Falha ao solicitar exclusão";b.disabled=false;}};refresh();return b;}
function showUsers(snapshot){
 const counts={pending:0,approved:0,revoked:0};snapshot.forEach(item=>{const s=item.data().status;if(Object.hasOwn(counts,s))counts[s]++});for(const s of Object.keys(counts))el(s+"Count").textContent=counts[s];
 const list=el("userList");const previous=list.querySelector('input')?.value||"";const previousFilter=list.querySelector('select')?.value||"all";list.replaceChildren();
 const h=document.createElement("h2");h.textContent="Gestão de usuários e acessos";list.append(h);
 const note=document.createElement("p");note.textContent="Acompanhe a validação automática dos cadastros. AP 204 é exclusivo do Master; ADM somente AP 101 e 201.";list.append(note);
 const search=document.createElement("input");search.placeholder="Pesquisar nome, e-mail ou apartamento";search.value=previous;search.setAttribute("aria-label","Pesquisar usuários");search.style.cssText="padding:10px;border:1px solid #cbd9e7;border-radius:8px;width:min(100%,360px);margin:8px 8px 8px 0";list.append(search);
 const filter=document.createElement("select");filter.setAttribute("aria-label","Situação do acesso");for(const [v,t] of [["all","Todas as solicitações"],["pending","Pendentes"]]){const o=document.createElement("option");o.value=v;o.textContent=t;filter.append(o)}filter.value=previousFilter;list.append(filter);
 const results=document.createElement("div");list.append(results);
 const activation=document.createElement("section");activation.style.marginTop="18px";list.append(activation);const activationTitle=document.createElement("h3");activationTitle.textContent="Pendentes de ativação do e-mail";const activationRows=document.createElement("div");const refresh=document.createElement("button");refresh.className="action";refresh.style.width="auto";refresh.textContent="Atualizar lista";activation.append(activationTitle,refresh,activationRows);
 async function loadActivation(){const actor=auth.currentUser?.uid,epoch=ctx.generation();refresh.disabled=true;activationRows.textContent="Consultando contas…";try{const records=await getDocsFromServer(collection(db,"registration_auth_inventory"));if(!activation.isConnected||actor!==auth.currentUser?.uid||epoch!==ctx.generation())return;activationRows.replaceChildren();const pending=records.docs.filter(d=>d.data().emailVerified===false&&!d.data().disabled);activationTitle.textContent="Pendentes de ativação do e-mail ("+pending.length+")";if(!pending.length)activationRows.textContent="Nenhuma conta pendente na última sincronização.";for(const record of pending){const data=record.data();const row=document.createElement("div");row.style.cssText="padding:12px;border-bottom:1px solid #dbe5ef";const name=document.createElement("strong");name.textContent=data.email||"E-mail indisponível";const state=document.createElement("p");state.textContent="Aguardando confirmação do e-mail"+(data.createdMillis?" · Cadastro: "+new Date(data.createdMillis).toLocaleString("pt-BR"):"");row.append(name,state,pendingDeleteButton(record.id,data.email));activationRows.append(row);}const note=document.createElement("small");note.textContent="Lista sincronizada periodicamente; atualizar consulta os dados já importados.";activationRows.append(note);}catch(e){if(activation.isConnected)activationRows.textContent="Consulta indisponível. Verifique as regras do Firebase e a sincronização.";}finally{refresh.disabled=false;}}refresh.onclick=loadActivation;loadActivation();
 const review=document.createElement("section");review.style.marginTop="18px";list.append(review);
 const reviewTitle=document.createElement("h3");reviewTitle.textContent="Solicitações de cadastro";review.append(reviewTitle);
 const reviewButton=document.createElement("button");reviewButton.type="button";reviewButton.textContent="Consultar solicitações";review.append(reviewButton);
 const reviewRows=document.createElement("div");review.append(reviewRows);
 reviewButton.onclick=async()=>{
  const actor=auth.currentUser?.uid,epoch=ctx.generation();reviewButton.disabled=true;reviewRows.textContent="Consultando solicitações...";
  try{
   const records=await getDocsFromServer(collection(db,"registration_review_private"));
   if(!review.isConnected||actor!==auth.currentUser?.uid||epoch!==ctx.generation())return;
   reviewRows.replaceChildren();
   if(records.empty){reviewRows.textContent="Nenhuma solicitação processada.";return;}
   for(const record of records.docs){
    const result=record.data().result||{},account=snapshot.docs.find(d=>d.id===record.id)?.data()||{};if(account.status!=="pending"||result.status==="test_matched")continue;
    const row=document.createElement("p");row.style.cssText="padding:12px;border-bottom:1px solid #dbe5ef";
    const label={matched:"CPF correspondente — verificar identidade",review:"Revisão manual necessária",invalid:"CPF inválido",not_found:"Cadastro não localizado"}[result.status]||"Resultado desconhecido";
    row.textContent=[account.email||"Conta não localizada",result.masked_name||"",result.unit?"AP "+result.unit:"",label].filter(Boolean).join(" · ");reviewRows.append(row);
    const claim=await getDocFromServer(doc(db,"registration_claims",record.id));
    const resident=result.status==="matched"&&units.includes(result.unit)&&result.unit!=="204"?await getDocFromServer(doc(db,"residents",result.unit)):null;
    if(!review.isConnected||actor!==auth.currentUser?.uid||epoch!==ctx.generation())return;
    const proposed=claim.data()||{},previous=resident?.data()||{};
    const comparison=document.createElement("div");
    for(const [label,before,after] of [["Telefone",previous.phone,proposed.phone],["E-mail",previous.email,proposed.email],["WhatsApp",undefined,typeof proposed.whatsapp==="boolean"?(proposed.whatsapp?"Sim":"Não"):undefined]]){
     const line=document.createElement("p");line.textContent=label+": "+(before||"Não informado")+" → "+(after||"Não informado");comparison.append(line);
    }
    row.append(comparison);
    const reason=result.autoReason==="email_mismatch"?"E-mail confirmado diferente da ficha cadastral. Corrija somente após verificar a identidade.":"Aguardando validação automática ou correção cadastral.";
    row.append(document.createTextNode(" · "+reason));
   }
  }catch(e){if(review.isConnected&&actor===auth.currentUser?.uid&&epoch===ctx.generation())reviewRows.textContent="Consulta indisponível. A integração cadastral ainda pode estar pendente.";}
  finally{reviewButton.disabled=false;}
 };
 const registry=document.createElement("section");registry.style.marginTop="18px";list.append(registry);
 const registryTitle=document.createElement("h3");registryTitle.textContent="Acessos por apartamento";registry.append(registryTitle);
 const roleFilter=document.createElement("select");roleFilter.setAttribute("aria-label","Filtrar perfil por apartamento");roleFilter.style.cssText="padding:10px;border:1px solid #cbd9e7;border-radius:8px;margin:8px 0";for(const [v,t] of [["all","Todos os perfis"],["master","Master"],["administrative","ADM"],["resident","Condômino"]]){const o=document.createElement("option");o.value=v;o.textContent=t;roleFilter.append(o)}registry.append(roleFilter);
 const registryRows=document.createElement("div");registry.append(registryRows);
 function filterRegistry(){for(const row of registryRows.children)row.hidden=roleFilter.value!=="all"&&row.dataset.profile!==roleFilter.value;for(const row of registryRows.children)row.style.display=row.hidden?"none":"flex"}roleFilter.onchange=filterRegistry;
 const registryActor=auth.currentUser?.uid,registryEpoch=ctx.generation();
 Promise.all([getDocsFromServer(collection(db,"residents")),getDocsFromServer(collection(db,"unit_access_preferences")).catch(()=>null)]).then(([residents,prefs])=>{
 if(!registry.isConnected||registryActor!==auth.currentUser?.uid||registryEpoch!==ctx.generation())return;
 const names=new Map(residents.docs.map(d=>[d.id,d.data()])), preferences=new Map((prefs?.docs||[]).map(d=>[d.id,d.data().role]));
 for(const unit of units){const data=names.get(unit)||{},accounts=snapshot.docs.filter(d=>d.data().unit===unit);const row=document.createElement("div");row.style.cssText="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px;border-bottom:1px solid #dbe5ef";
 row.dataset.profile=unit==="204"?"master":accounts.some(d=>d.data().status==="approved"&&d.data().role==="administrative")?"administrative":accounts.some(d=>d.data().status==="approved"&&d.data().role==="resident")?"resident":preferences.get(unit)||"resident";const label=document.createElement("div");label.style.flex="1";const title=document.createElement("strong");title.textContent="AP "+unit+" — "+(data.responsible||data.owner||"Sem cadastro");const status=document.createElement("p");status.style.margin="4px 0";status.textContent=unit==="204"?"Master — sessão ativa":accounts.some(d=>d.data().status==="approved")?"Acesso autorizado":accounts.some(d=>d.data().status==="revoked")?"Acesso revogado":accounts.length?"Aguardando autorização":"Aguardando criação e associação de conta";label.append(title,status);row.append(label);
 if(unit!=="204"){const select=document.createElement("select");select.setAttribute("aria-label","Perfil pretendido AP "+unit);for(const [v,t] of [["resident","Condômino"],["administrative","ADM"]]){const o=document.createElement("option");o.value=v;o.textContent=t;o.disabled=v==="administrative"&&!["101","201"].includes(unit);select.append(o)}select.value=preferences.get(unit)||"resident";row.append(select);const save=document.createElement("button");save.className="action";save.style.width="auto";save.textContent="Definir perfil de acesso";save.disabled=!prefs;row.append(save);save.onclick=async()=>{if(!row.isConnected||registryActor!==auth.currentUser?.uid||registryEpoch!==ctx.generation())return;save.disabled=true;try{await setDoc(doc(db,"unit_access_preferences",unit),{role:select.value,updatedBy:registryActor,updatedAt:serverTimestamp()});status.textContent="Perfil definido — aplicado após validação cadastral de novos acessos.";if(!accounts.some(d=>d.data().status==="approved"))row.dataset.profile=select.value;filterRegistry();}catch(e){status.textContent="Não foi possível definir o perfil de acesso."}finally{save.disabled=false}};}
  registryRows.append(row);
 }filterRegistry();if(!prefs){const warning=document.createElement("p");warning.textContent="Publique as regras atualizadas do Firebase para salvar perfis previstos.";registry.append(warning)}
 }).catch(()=>{registryRows.textContent="Não foi possível consultar os cadastros das unidades."});

 const actor=auth.currentUser?.uid,epoch=ctx.generation();
 function draw(){results.replaceChildren();const q=search.value.trim().toLowerCase();let found=0;
 for(const item of snapshot.docs){const data=item.data();if(data.status!=="pending")continue;if(filter.value!=="all"&&data.status!==filter.value)continue;if(q&&![data.name,data.email,data.unit].some(v=>String(v||"").toLowerCase().includes(q)))continue;found++;
 const row=document.createElement("section");row.style.cssText="padding:16px 0;border-bottom:1px solid #dbe5ef";
 const label=document.createElement("strong");label.textContent=data.name||data.email||"Usuário";row.append(label);
 const info=document.createElement("p");info.textContent=(data.email||"")+" · "+({pending:"Pendente",approved:"Autorizado",revoked:"Revogado"}[data.status]||"Desconhecido")+" · "+(data.role==="administrative"?"ADM":data.role==="resident"?"Condômino":"Sem perfil");row.append(info);
if(data.status==="pending")row.append(pendingDeleteButton(item.id,data.email));results.append(row);
 }if(!found)results.textContent="Nenhum usuário encontrado.";
 }search.oninput=draw;filter.onchange=draw;draw();
}

return {showUsers};}
