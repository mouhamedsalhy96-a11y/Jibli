import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../src/lib/domain.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded={exports:{}};new Function('module','exports',source)(loaded,loaded.exports);const d=loaded.exports;
const now='2026-11-11T12:00:00.000Z';
const contact={name:'Client fictif',email:'client@example.com',phone:'+216 20 202 020',city:'Tunis'};
const item=()=>d.makeItem({url:'https://fr.shein.com/example.html#details',title:'Chemise test',variant:'Beige, M',quantity:2,note:''},'item-1');
const base=()=>d.newOrder([item()],contact,'order-test-0001',now);
const draft=()=>({unitPrices:{'item-1':30125},costs:{transport:10000,customs:3000,service:5000,delivery:7000},validDays:7,minDays:12,maxDays:18,note:'Devis fictif'});
const quoted=()=>d.publishQuote(base(),draft(),now);
test('only HTTPS links on allowed shop domains are accepted',()=>{
 assert.equal(d.identifyShop('https://fr.shein.com/example.html').shop,'shein');
 assert.equal(d.identifyShop('https://a.aliexpress.com/example').shop,'aliexpress');
 for(const url of ['http://shein.com/item','https://shein.com.attacker.example/item','https://attacker.example/?next=shein.com','https://user:password@shein.com/item','javascript:alert(1)','https://shein.com:444/item'])assert.throws(()=>d.identifyShop(url));
});
test('amounts use exact millimes and accept French decimal notation',()=>{
 assert.equal(d.parseMoney('30,125'),30125);assert.equal(d.parseMoney('0.005'),5);assert.equal(d.parseMoney('10'),10000);
 for(const value of ['-1','1.0001','1e5','NaN','', '12 000'])assert.throws(()=>d.parseMoney(value));
});
test('item quantities, variants and title must be explicit',()=>{
 for(const values of [{quantity:0},{quantity:21},{quantity:1.5},{variant:''},{title:'x'}])assert.throws(()=>d.makeItem({...item(),...values},'test'));
 assert.ok(!item().url.includes('#'));
});
test('new orders validate the contact and snapshot the basket',()=>{
 const items=[item()];const order=d.newOrder(items,contact,'test-id',now);items[0].title='Changed later';
 assert.equal(order.items[0].title,'Chemise test');assert.equal(order.status,'awaiting_quote');assert.equal(order.customer.phone,'+21620202020');
 assert.throws(()=>d.newOrder([],contact,'test',now));assert.throws(()=>d.newOrder([item()],{...contact,phone:'123'},'test',now));
});
test('quote total includes each item quantity and every explicit fee',()=>{
 const order=quoted();assert.equal(order.quote.total,85250);assert.equal(order.quote.version,1);assert.equal(order.status,'quote_ready');
 assert.equal(order.quote.validUntil,'2026-11-18T12:00:00.000Z');
});
test('all items must be priced and fee keys cannot be silently added',()=>{
 for(const update of [{unitPrices:{}},{unitPrices:{'item-1':0}},{costs:{...draft().costs,hiddenFee:1000}},{costs:{...draft().costs,service:-1}}])assert.throws(()=>d.publishQuote(base(),{...draft(),...update},now));
});
test('quote revisions increment the version without mutating the original',()=>{
 const first=quoted();const second=d.publishQuote(first,{...draft(),note:'Révision'},now);assert.equal(first.quote.version,1);assert.equal(second.quote.version,2);assert.equal(first.quote.note,'Devis fictif');
});
test('customers cannot accept an old or expired quote version',()=>{
 const revised=d.publishQuote(quoted(),draft(),now);assert.throws(()=>d.acceptQuote(revised,1,now));
 assert.throws(()=>d.acceptQuote(quoted(),1,'2026-11-18T12:00:00.000Z'));
});
test('acceptance freezes the quote and records its exact version',()=>{
 const accepted=d.acceptQuote(quoted(),1,now);assert.equal(accepted.status,'awaiting_payment');assert.equal(accepted.acceptedVersion,1);
 assert.throws(()=>d.publishQuote(accepted,draft(),now));assert.throws(()=>d.acceptQuote(accepted,1,now));
});
test('declined quotes cannot enter the payment workflow',()=>{
 const declined=d.declineQuote(quoted(),1,now);assert.equal(declined.status,'declined');assert.throws(()=>d.declarePayment(declined,'Adresse fictive 123','TEST-123456',now));
});
test('payment needs an accepted quote and complete fictional delivery details',()=>{
 assert.throws(()=>d.declarePayment(quoted(),'Adresse fictive 123','TEST-123456',now));
 const accepted=d.acceptQuote(quoted(),1,now);assert.throws(()=>d.declarePayment(accepted,'x','TEST-123456',now));assert.throws(()=>d.declarePayment(accepted,'Adresse fictive 123','x',now));
 const payment=d.declarePayment(accepted,'Adresse fictive 123','TEST-123456',now);assert.equal(payment.status,'payment_review');
});
test('fulfillment cannot skip payment review or transport tracking',()=>{
 assert.throws(()=>d.advanceOrder(base(),'ordered',now));
 const payment=d.declarePayment(d.acceptQuote(quoted(),1,now),'Adresse fictive 123','TEST-123456',now);
 const confirmed=d.advanceOrder(payment,'ordered',now);assert.throws(()=>d.advanceOrder(confirmed,'delivered',now));assert.throws(()=>d.advanceOrder(confirmed,'in_transit',now,''));
 const shipping=d.advanceOrder(confirmed,'in_transit',now,'DEMO-TRACK');const delivered=d.advanceOrder(shipping,'delivered',now);assert.equal(delivered.status,'delivered');assert.equal(delivered.tracking,'DEMO-TRACK');
});
test('invalid validity and delivery windows cannot be published',()=>{
 for(const update of [{validDays:0},{validDays:31},{minDays:20,maxDays:12},{maxDays:181}])assert.throws(()=>d.publishQuote(base(),{...draft(),...update},now));
});
