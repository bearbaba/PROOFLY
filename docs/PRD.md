# PROOFLY — PRD, kiến trúc và kế hoạch build

Phiên bản 1.0 • 10/10/2026 • Bản thiết kế, chưa phải sản phẩm đã triển khai.

## 1. Quyết định sản phẩm

**PROOFLY: Agree on the work. Verify the evidence.**

Một ứng dụng nghiệm thu công việc số bằng tiêu chí đã thống nhất, bằng chứng và đồng thuận GenLayer. Chủ dự án tạo brief; người thực hiện chấp nhận tiêu chí; cả hai theo dõi nghiệm thu từng yêu cầu và nhận biên nhận công khai có thể kiểm chứng.

Giả định: mô tả PROOFLY trong đoạn trao đổi trước chưa khôi phục được. Tài liệu này chốt hướng “nghiệm thu công việc dựa trên bằng chứng”. Đây là quyết định thiết kế đề xuất, không phải tuyên bố về một định nghĩa đã xác nhận trước đó.

Khách hàng đầu tiên: các nhóm Web3 nhỏ thuê contributor viết tài liệu, hướng dẫn onboarding và tài liệu release. Người trả tiền là project lead/community lead; người dùng còn lại là contributor. Nhu cầu lặp lại: một nhóm nghiệm thu nhiều sản phẩm theo tháng, cần giảm thời gian kiểm tra và tranh cãi về phạm vi.

MVP chọn một người thực hiện được chỉ định cho mỗi work order. Không mở thị trường cạnh tranh nhiều bài nộp ngay từ đầu. Cách này giảm vấn đề tuyển chọn, trùng bài và phân chia thưởng.

Giá trị: “Hai bên biết thế nào là hoàn thành trước khi bắt đầu; khi nộp bài, biết yêu cầu nào đạt và yêu cầu nào cần sửa.” GenLayer phù hợp với phần đánh giá ngữ nghĩa cần một kết quả chung, còn thao tác thông thường vẫn dùng code.

Không cam kết AI luôn đúng, không chứng nhận tác giả nguyên bản, không chứng nhận an toàn code hoặc uy tín toàn diện. Biên nhận xác nhận kết quả nghiệm thu một phiên bản công việc theo một bộ tiêu chí.

## 2. PRD

### Vấn đề và giả thuyết

Brief mơ hồ dẫn đến sửa nhiều vòng; owner tốn thời gian review; contributor khó biết tại sao bị từ chối; lịch sử công việc nằm rải rác và khó đối chiếu. Giả thuyết: tiêu chí rõ và verdict ở cấp yêu cầu giảm thời gian review và giảm số vòng sửa không cần thiết. Phải kiểm chứng với pilot, chưa xem là nhu cầu thị trường đã xác thực.

### Người dùng và quyền

| Vai trò | Quyền |
|---|---|
| Owner | Tạo nháp, chọn contributor, gửi đề nghị, hủy trước khi chấp nhận, theo dõi và phản hồi |
| Contributor | Chấp nhận hoặc từ chối, nộp bằng chứng, sửa trong hạn, xem biên nhận |
| Viewer | Đọc hồ sơ công khai, kiểm tra contract/transaction/version |
| Operator | Quản lý index và lỗi vận hành; không tự sửa verdict onchain |

### Luồng chính

1. Owner chọn template “Documentation delivery”.
2. Nhập mục tiêu, audience, nguồn chính thức, 3–5 yêu cầu, hạn nộp và hạn sửa.
3. Assistant ngoài chuỗi phát hiện từ mơ hồ như “hay”, “đẹp”, “đầy đủ”; đề xuất tiêu chí có thể chứng minh. Owner tự duyệt.
4. Contributor xem bản cuối, ký chấp nhận. Spec, policy và danh sách nguồn được khóa bằng hash/version.
5. Contributor nộp artifact, evidence manifest và ánh xạ bằng chứng vào từng yêu cầu.
6. Preflight kiểm tra đường dẫn, dung lượng, hash, các mục bắt buộc. Preflight chỉ hỗ trợ; contract vẫn kiểm tra ràng buộc quan trọng.
7. Gửi giao dịch đánh giá. UI hiển thị trạng thái mạng, chưa gọi kết quả sơ bộ là đã hoàn tất.
8. GenLayer đánh giá các yêu cầu; code tổng hợp kết quả; UI chờ finality đã xác nhận từ adapter.
9. Nếu cần sửa: tạo submission version mới, giữ nguyên lịch sử cũ. Nếu đạt: cấp trang biên nhận.
10. Hai bên có thể ghi nhận thanh toán bên ngoài. MVP không tự giữ hoặc chuyển tiền.

### Yêu cầu chức năng

| ID | Yêu cầu | Điều kiện nghiệm thu |
|---|---|---|
| F01 | Tạo work order từ template | Chặn thiếu nguồn, deadline không hợp lệ, tiêu chí ngoài giới hạn |
| F02 | Chấp nhận và khóa spec | Chỉ contributor chỉ định chấp nhận; owner không sửa bản đã khóa |
| F03 | Nộp hồ sơ có phiên bản | Hash manifest/artifact; mỗi phiên bản bất biến; chống nộp ngoài quyền |
| F04 | Đánh giá từng yêu cầu | Có status, reason code và evidence reference; không chỉ trả điểm tổng |
| F05 | Sửa và nộp lại | Tối đa hai lần nộp, gồm bản đầu và một bản sửa; tuân thủ hạn sửa đã khóa |
| F06 | Biên nhận công khai | Có spec/submission/policy hash, verdict, thời điểm, network, contract, transaction |
| F07 | Khôi phục UI | Reload không mất trạng thái; không gửi trùng khi RPC timeout |
| F08 | Dashboard | Lọc việc của tôi, cần hành động, đang xác minh, hoàn tất |
| F09 | Phản hồi kết quả | Ghi nhận phản hồi; không biến một nút phản đối thành protocol appeal giả |
| F10 | Hết hạn/hủy | Quy tắc thời gian rõ; không hủy hồ sơ đang đánh giá để xóa lịch sử |

### Giới hạn MVP

Một template; 3–5 yêu cầu bắt buộc; một contributor; tài liệu text/Markdown công khai; tối đa ba artifact và năm evidence reference; tối đa hai phiên bản submission. Giới hạn byte/token cần hiệu chỉnh sau benchmark và enforce cả backend lẫn contract. Không âm thầm cắt tài liệu làm mất phần quyết định; hồ sơ quá dài phải bị từ chối hoặc chia trước khi khóa.

Chưa hỗ trợ: X login, Discord riêng tư, Google Docs cần đăng nhập, video dài, đánh giá thẩm mỹ, chứng minh originality, thực thi code người dùng, agent marketplace, token riêng, leaderboard và escrow mainnet.

### Phi chức năng

Public read không cần ví; mobile usable từ 375px; keyboard navigation và status có chữ; backend có rate limit; URL loader có SSRF protection; schema validation; version pinning; index có thể rebuild; redacted logs; wallet signature gắn domain/network/nonce/expiry và chỉ dùng schema đã kiểm chứng. Không công khai tài liệu nhạy cảm. Hash không cung cấp privacy và không bảo đảm lưu trữ lâu dài.

### Pilot và chỉ số

North-star: số work order thực tế có verdict finalized và được hai bên sử dụng trong nghiệm thu, không đếm số ví.

Pilot: 3 project, tổng 20 work order, trong đó có owner tạo lần thứ hai. Đo thời gian owner review so với baseline trước dùng, tỷ lệ sửa thành công, tỷ lệ không đủ bằng chứng, lỗi kỹ thuật, phản hồi hai bên, chi phí mỗi verdict và p50/p95 latency. Mục tiêu thử nghiệm: giảm median thời gian review 30%; ít nhất hai project quay lại. Đây là giả thuyết và ngưỡng nội bộ, không phải số liệu thực tế.

## 3. Điểm khác biệt

| Sản phẩm/use case | Đặc điểm được nguồn mô tả | Hướng khác biệt của PROOFLY |
|---|---|---|
| Dework | Quản lý công việc, bounty, thanh toán token và hồ sơ contributor | Tập trung hợp đồng nghiệm thu, evidence mapping và receipt có phiên bản |
| Kleros | Phân xử tranh chấp với evidence và quy trình tòa/juror | Nghiệm thu chủ động trong luồng giao việc trước khi phát sinh tranh chấp |
| Rally/use case agent delivery trên GenLayer | Trang GenLayer giới thiệu kiểm tra marketing và đánh giá output theo prompt | Chọn tài liệu kỹ thuật, tiêu chí khóa, sửa theo yêu cầu và provenance rõ |
| genlayer-ai-bounty-verifier | Kết quả tìm kiếm mô tả verifier bằng chứng bounty qua consensus | Không tuyên bố “AI bounty verifier đầu tiên”; mở rộng thành workflow hai bên |
| ProofSpec của người dùng | Ngữ cảnh hiện có mô tả primitive đánh giá obligation | Có thể làm engine phía dưới; PROOFLY là sản phẩm workflow và UX |

Không có đủ bằng chứng để khẳng định các sản phẩm trên không có từng tính năng PROOFLY. Bảng này xác định hướng cạnh tranh, không phải audit toàn bộ thị trường. Repository verifier chưa đọc được toàn bộ trong lần nghiên cứu này; cần audit code trước khi pitch “độc nhất”.

Moat kỳ vọng: thư viện template đã benchmark, tập case có label, tích hợp workflow, owner sử dụng lặp lại, lịch sử spec–evidence–verdict. Không lấy tên, prompt bí mật hoặc dashboard đẹp làm moat. Lợi thế cần được xây và đo.

## 4. Kiến trúc kỹ thuật

### Thành phần

| Thành phần | Đề xuất | Trách nhiệm |
|---|---|---|
| Web | React + TypeScript + Vite | Wizard, dashboard, evidence view, receipt |
| Wallet/network adapter | GenLayer JS, version pin sau spike | Ký/gửi, fee preflight, đọc receipt và theo dõi finality |
| BFF | Node + TypeScript | Draft, auth, upload, preflight, rate limit |
| DB | PostgreSQL | Draft và chỉ mục; không quyết định verdict |
| Artifact store | Object storage content-addressed; mirror tùy pilot | Giữ byte bất biến, public fetch, integrity check |
| Index worker | Poll RPC trước; event adapter khi hỗ trợ đã kiểm chứng | Đồng bộ finalized state, retries và recovery |
| Intelligent Contract | Python/GenVM | Spec lock, authorization, evaluation, immutable receipt |
| Test harness | Python + frontend test tooling + Studio | Fixtures, invariants, live integration |

Luồng: Web → chuẩn bị artifact qua BFF → ví gửi giao dịch tới contract → leader và validators độc lập tải bằng chứng → contract tổng hợp → adapter chờ finality → index/dashboard/receipt đọc kết quả.

Onchain giữ identity, quyền, hash/version, yêu cầu ngắn, các tham chiếu bằng chứng, classification và result. Offchain giữ draft, nội dung dài, search index và giải thích mở rộng. Mất DB phải rebuild được kết quả finalized từ chain và manifests; nếu storage mất, không được tuyên bố có thể khôi phục bytes chỉ từ hash.

### Mô hình dữ liệu

WorkOrder: id, owner, contributor, title, template_version, policy_version, spec_hash, source_manifest_hash, requirements[], submit_deadline, revision_deadline, max_submissions, accepted_version, status.

Requirement: id, text, expected_evidence_type, allowed_source_refs, mandatory. MVP tất cả mandatory; thêm dependency/weight ở giai đoạn sau nếu nhu cầu chứng minh được.

Submission: id, order_id, version, submitter, evidence_manifest_hash, artifact_hashes[], manifest_uri, submitted_at, evaluation_ref, lifecycle_status.

RequirementResult: requirement_id, status, reason_code, evidence_refs[]. Receipt: receipt_id, order_id, submission_id, spec_hash, policy_version, result_vector, outcome, evaluation_transaction_ref. Finality và block metadata do RPC adapter đối chiếu; không giả định contract biết transaction hash tại execution.

### API/contract interface đề xuất

Các tên dưới đây là thiết kế, chưa phải SDK code chạy được:

- create_order(spec, contributor): owner tạo đề nghị.
- accept_order(order_id, spec_hash): contributor chấp nhận đúng bản.
- cancel_order(order_id): owner chỉ hủy trước accept.
- submit_evidence(order_id, manifest_uri, manifest_hash): contributor nộp trong hạn.
- evaluate_submission(submission_id): permissionless trigger cho submission chưa đánh giá; người gửi chịu phí theo UX rõ ràng.
- close_expired_order(order_id): đóng sau deadline hợp lệ khi không còn evaluation đang xử lý.
- get_order / get_submission / get_receipt: read.

Draft ngoài chain qua POST /drafts. Preflight qua POST /submissions/preflight. Read index qua GET /orders và GET /receipts/:id. POST /feedback lưu phản hồi, không sửa verdict. App cần pagination, idempotency key và tx correlation. Không sử dụng admin endpoint set_verdict.

### GenLayer và Equivalence Principle

Web/LLM calls chạy trong nondeterministic block. Leader đề xuất vector classification; validators độc lập tải đúng bytes/hash và đánh giá lại cùng tiêu chí. Custom equivalence kiểm tra quyết định từng requirement, evidence references hợp lệ và identity/version; không chỉ kiểm tra JSON đúng schema. Tên API hiện tại trong tài liệu là gl.vm.run_nondet_unsafe cho custom validator; phải pin phiên bản GenVM và thử trong môi trường triển khai trước khi viết production code.

Không so câu giải thích theo byte. Không dùng tolerance điểm tổng để che việc một validator cho PASS, một validator cho FAIL. MVP so exact status vector chuẩn hóa. Nếu exact vector gây khó hội tụ, sửa tiêu chí hoặc thu hẹp template và benchmark lại, không nới rule để kết quả tiền bạc trái nhau được xem là tương đương.

Reason code ngắn và evidence references thuộc phần receipt. Giải thích mở rộng do UI tạo từ receipt, phải gắn nhãn hỗ trợ và không tự thêm kết luận. Validator cũng kiểm tra citation/reason có cơ sở; chữ giải thích không được phép sửa classification.

### Quy tắc kết quả

Requirement status: SATISFIED, UNSATISFIED, UNVERIFIABLE.

- SATISFIED: bằng chứng đủ cho yêu cầu.
- UNSATISFIED: bằng chứng hợp lệ cho thấy yêu cầu không được đáp ứng.
- UNVERIFIABLE: thiếu hoặc không thể xác nhận bằng chứng đủ để quyết định.

MVP tất cả requirement bắt buộc. Tất cả SATISFIED → ACCEPTED. Có UNSATISFIED → CHANGES_REQUIRED, đồng thời vẫn hiển thị mọi UNVERIFIABLE. Không có UNSATISFIED nhưng có UNVERIFIABLE → EVIDENCE_REQUIRED. Hết cửa sổ sửa mà chưa ACCEPTED → CLOSED_NOT_ACCEPTED; giữ nguyên các classification và không quy UNVERIFIABLE thành thất bại kỹ thuật của bài.

Lỗi RPC, VM, LLM hoặc timeout toàn lần đánh giá → TECHNICAL_ERROR/RETRY_PENDING trong lifecycle, không ghi bài không đạt. Không hội tụ consensus → trạng thái unresolved theo protocol adapter, không tự đổi thành verdict nghiệp vụ. Tối đa retry kỹ thuật phải có budget và không tăng số lần sửa bài.

### Bằng chứng và trust boundary

Contributor nộp manifest ánh xạ requirement → artifact section → source ref. Storage URL mang content hash; contract/validators tải byte và kiểm tra hash trước đánh giá. Source official được khóa trong spec hoặc source manifest lúc accept. Một hash chứng minh byte không đổi, không chứng minh nội dung là thật hoặc người nộp là tác giả.

Tách artifact của contributor khỏi nguồn chứng minh bên ngoài. Snapshot do BFF chụp có rủi ro nguồn bị BFF xuyên tạc. MVP chỉ tuyên bố đối chiếu với source bundle hai bên đã chấp nhận; public origin URL là provenance, không giả định snapshot tự có chữ ký nguồn. Khi live origin đổi, ghi nhận source drift, không dùng âm thầm bản mới để xét bài cũ. Nếu pilot cần chứng minh trạng thái lịch sử của bên thứ ba, phải bổ sung trusted timestamp/attestation với trust assumptions được công khai hoặc để ngoài phạm vi.

Một tutorial vượt rubric chỉ chứng minh nội dung đáp ứng rubric; không chứng minh người dùng thực hiện giao dịch thành công. Screenshot giả không phải bằng chứng quyền sở hữu tài khoản. Tương lai cần wallet signature hoặc platform attestation riêng.

### Finality, sửa bài và appeal

Work-order state và transaction state phải tách. Proposed/evaluating/result provisional/finalized là UX mapping từ SDK/RPC thực, không enum protocol tự đặt. Transaction accepted chưa được UI coi là receipt finalized. Store chain id, contract và tx reference; chống kết quả cũ ghi đè submission mới.

Sửa bài tạo hồ sơ mới. Phản hồi nghiệp vụ không phải protocol appeal. MVP cung cấp liên kết và hướng dẫn protocol appeal khi mạng đích hỗ trợ đã kiểm chứng; chưa hứa appeal một nút. Việc đổi spec yêu cầu hai bên tạo order/version mới, không hồi tố.

Không hard-code thời gian finality hay fee. Phase 0 phải xác định mạng, SDK/RPC version, read consistency, fee estimation, transaction status và appeal support. Escrow sau này phải chặn giải ngân trước finality và có state machine riêng.

### Security

Evidence là dữ liệu không đáng tin: không cho nội dung “ignore rubric” thay đổi prompt hệ thống; delimiter, schema, allowlist refs và độc lập kiểm tra. Không chạy code hay follow URL tùy ý trong artifact. URL ingestion chặn private/link-local IP, redirects nguy hiểm, DNS rebinding, credential URLs; giới hạn số request, byte và timeout. Contract dùng allowlist host/content pattern cho MVP và không phụ thuộc preflight backend để enforce giới hạn.

Chống replay/cross-order: contributor auth, chain/domain scope, order/version/hash binding và idempotency. Chống griefing: caps, một evaluation active mỗi submission, rate/budget limits; estimate phí trước ký. Giữ nguyên quyền đọc receipt khi incident. Pause, nếu thêm, chỉ chặn ghi/đánh giá mới theo policy công khai; không cho admin sửa verdict cũ.

Không tuyên bố decentralized end-to-end nếu object storage hoặc BFF do một bên vận hành. GenLayer cung cấp consensus cho kết quả; nguồn dữ liệu, nguồn bằng chứng và availability có trust boundary riêng.

## 5. Giao diện

Thiết kế sáng, chuyên nghiệp, ưu tiên nội dung: nền #F7F8FA, chữ #172033, accent teal #087F8C; status green/amber/red có icon và text. Font system/Inter tùy tài nguyên, số tabular, card radius 12px, khoảng cách 8/16/24px. Desktop bố cục artifact–rubric hai cột, mobile rubric trước và evidence accordion. Tất cả UI demo phải ghi nhãn dữ liệu mẫu.

| Màn hình | Nội dung chính | Hành động |
|---|---|---|
| Home | Promise, 3 bước, ví dụ receipt | Create work order / View example |
| Workspace | “Cần bạn xử lý”, “Đang xác minh”, “Đã hoàn tất” | Mở work order |
| Create | 4 bước: Brief → Criteria → Evidence → Review | Send for acceptance |
| Order | Spec đã khóa, assignee, hạn, revision policy | Accept / Submit evidence |
| Submission | Upload text, hash, requirement mapping, preflight | Verify with GenLayer |
| Review | Từng requirement, status, reason và nguồn | Revise submission / View evidence |
| Receipt | Verdict, version, hash, finalized state, provenance | Copy link / Open explorer |

Review là màn hình chủ lực: phần đầu hiển thị “Cần bổ sung bằng chứng”, kế dưới “3/4 yêu cầu đã đáp ứng”; từng dòng có “Xem nguồn”. Không đặt điểm 92/100 làm người dùng hiểu sai rằng thiếu mandatory vẫn đạt. Fee modal ghi network, estimate, người trả phí và retry policy; không hứa free.

Copy mẫu: “Yêu cầu đã khóa”; “Đang chờ xác nhận cuối cùng”; “Không đủ bằng chứng để kết luận”; “Sửa tài liệu và nộp phiên bản mới”. Viewer không phải connect ví để xem. Pending quá lâu hiển thị tx link và retry tracking, không gửi giao dịch mới tự động.

## 6. Demo và MVP

Demo template: viết hướng dẫn kết nối ví và đọc một contract trong GenLayer Studio theo source bundle đã chấp nhận.

R1: nêu rõ môi trường thử nghiệm và phí/token liên quan. R2: có đủ bước kết nối ví và mở contract. R3: mô tả đúng cách đọc trạng thái, có source ref cho những bước cần xác minh. R4: nêu ít nhất hai lỗi thường gặp và cách xử lý có cơ sở trong nguồn.

Fixture A: đầy đủ → ACCEPTED. Fixture B: thiếu R4 có thể quan sát → CHANGES_REQUIRED. Fixture C: claim ở R3 không có nguồn đủ → EVIDENCE_REQUIRED khi các yêu cầu khác đạt. Fixture D: evidence chứa prompt injection → không thay rubric. Fixture E: content hash sai → không đánh giá nội dung bị thay. Fixture F: RPC/LLM timeout → lỗi kỹ thuật, không FAIL.

Video demo 90–120 giây: gửi brief → accept → nộp bài thiếu → xem lý do → sửa → finalized receipt. Demo này là bằng chứng năng lực sản phẩm; không chứng minh có traction.

## 7. Build plan thực tế

Giả định một developer làm tập trung, dùng thư viện có sẵn, scope như trên. Ước lượng 5 tuần cộng 1 tuần buffer; network/SDK hoặc evidence-fetch blocker có thể kéo dài. Bản demo hẹp 10–14 ngày khả thi nếu spike thành công, không gọi đó là MVP đủ pilot.

| Giai đoạn | Công việc | Exit gate |
|---|---|---|
| Tuần 1, ngày 1–3 | 3 owner interviews; prototype một evaluate call; đo phí/latency; test public storage hash fetch, wallet/finality | Một đường submit→evaluate→finalized chạy thật; quyết định network và SDK |
| Tuần 1 còn lại | Schema, template, policy, corpus; audit ProofSpec hiện có nếu được dùng | Rubric đủ rõ; không dựa vào deployed contract cũ chưa đọc |
| Tuần 2 | Order/accept/submission contract, evaluator, result aggregator và adversarial fixtures | PASS/changes/evidence-required/technical error đúng; immutable versions |
| Tuần 3 | BFF/storage/index, wallet adapter, create/order/review/receipt UI | Full flow thật; reload/timeout không duplicate |
| Tuần 4 | Integration, benchmark consensus, injection/hash/source drift tests; QA mobile | Đạt quality gates và công khai giới hạn |
| Tuần 5 | Pilot ba nhóm, khoảng 20 work orders, sửa blocker; demo/readme | Có phản hồi hai bên và số liệu chi phí/latency |
| Tuần 6 buffer | SDK/RPC issues, không hội tụ và pilot feedback | Go/no-go bản beta |

### Quality gates

1. Deterministic invariants: không sửa accepted spec; unauthorized submit bị chặn; version không overwrite; sai hash không xét; deadline đúng; aggregation đúng.
2. Corpus tối thiểu 40 hồ sơ do người review gán nhãn, gồm pass/fail/unknown/injection/source drift. Tách tập chỉnh prompt khỏi tập holdout. Chạy ít nhất ba lần cho mỗi holdout case trên cấu hình validator thực tế, ghi riêng lỗi hội tụ.
3. Gate nội bộ ban đầu: không false ACCEPTED ở adversarial holdout; ≥90% agreement với nhãn trên case rõ; unknown không bị biến thành fail. Nếu sample nhỏ, phải công khai giới hạn; 0 lỗi trong sample không có nghĩa rủi ro bằng 0.
4. E2E thật: create→accept→submit→evaluate→finalized→public receipt; reload, rejected signature, RPC outage và nguồn không truy cập được.
5. Budget gate: đo phí và p95 latency với tài liệu dài nhất cho phép; nếu vượt mức pilot chịu được, giảm requirement/bytes trước khi thêm tính năng.

### Repository đề xuất

apps/web; apps/api; contracts/proofly; packages/schema; packages/genlayer-adapter; fixtures/evidence; tests/integration; docs. Monorepo nhẹ; chưa microservices. CI chạy schema/typecheck, deterministic contract tests và frontend E2E quan trọng; live consensus benchmark chạy riêng có budget.

Nếu dùng ProofSpec, đọc code/repo và benchmark trước. Ngữ cảnh có địa chỉ 0x1423CaEFCB857942C3b0cD63D2CA745D2cB93AEc, nhưng tài liệu này không xác minh bytecode, ABI, network hiện tại hoặc khả năng reuse. Không đổi contract đã deploy chỉ vì đổi brand; engine mới cần version mapping minh bạch.

## 8. Phát triển người dùng và doanh thu

Lấy owner làm đầu kéo: mỗi owner mời contributor sẵn có. Không mở marketplace trống. Mời pilot qua mối quan hệ cộng đồng của người dùng; tạo ba template thực tế từ công việc họ đang giao. Public receipt chia sẻ tự nhiên từ một công việc hoàn tất, không ép đăng bài để nhận điểm.

Discovery hỏi về ba job gần nhất, thời gian review, vòng sửa và tranh cãi thật. Nếu họ thích demo nhưng không đưa job thật vào, chưa coi là validation. Không lấy wallet count và faucet activity làm nhu cầu.

MVP không có token và không thu tiền thật. Sau pilot có thể thử owner subscription/workspace hoặc phí mỗi verdict; network fee tách rõ. Chưa đặt giá USD khi chưa biết unit economics. Công thức: doanh thu – phí được tài trợ – storage/BFF/AI support – customer support. Consensus retry và một người review tranh chấp có thể làm phí tăng mạnh.

V1.1 sau pilot: multiple milestones, template mở rộng, chủ động archive/mirror, export, organization workspace. V2: integration/API và agent client theo schema version. Escrow là nhánh riêng, chỉ build sau khi chứng minh demand và kỹ thuật settlement mạng đích. Mainnet money cần transfer compatibility, finality/appeal behavior, refund/timeout, payment invariants và review độc lập; không dùng receipt demo để quảng cáo funds protected.

## 9. Rủi ro và quyết định go/no-go

| Rủi ro | Hành động |
|---|---|
| Rubric mơ hồ, consensus chậm | Một template, case có label, chỉnh tiêu chí trước khi mở rộng |
| Nguồn thay đổi/không truy cập | Locked bundle, hash integrity, explicit provenance, unknown/retry |
| Storage tập trung | Công khai boundary; mirror khi pilot cần; không hứa fully decentralized |
| Owner không quay lại | Phỏng vấn hành vi, giảm thời gian review, đổi vertical nếu pilot không dùng |
| Chi phí lớn hơn giá trị task | Đo thực; giới hạn artifact và số requirement; không sponsor vô hạn |
| Receipt bị hiểu thành reputation | Scope/version/source visibility; không universal score |
| Trùng sản phẩm hiện có | Audit đối thủ sâu trước pitch; tập trung workflow nghiệm thu tài liệu |
| Tên PROOFLY đã được dùng | Kiểm tra domain/brand trước launch; tên hiện là working brand |

Go tiếp nếu owner dùng job thật, quay lại, verdict ổn trên scope hẹp và unit economics có đường đi. Nếu chỉ có người xem demo, tỷ lệ unknown cao hoặc consensus không ổn, thu hẹp/đổi template trước khi mở marketplace hay tiền thật.

## 10. Nguồn tham khảo và giới hạn nghiên cứu

Truy cập 10/10/2026. Phần thiết kế, mục tiêu và thời gian là đề xuất của tài liệu.

- https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle — leader/validator và independent verification.
- https://docs.genlayer.com/developers/intelligent-contracts/features/web-access — web access trong nondeterministic blocks.
- https://docs.genlayer.com/understand-genlayer-protocol — execution, consensus, appeals và finality overview.
- https://docs.genlayer.com/developers/intelligent-contracts/when-to-use-genlayer — dùng GenLayer cho judgment/settlement cần chung kết quả.
- https://genlayer.com/ — use cases marketing/agent delivery; mô tả của chính dự án, không phải independent traction verification.
- https://dework.xyz/ — task/bounty, contributor và token payments.
- https://docs.kleros.io/products/court — dispute resolution qua court.
- https://docs.kleros.io/developer/arbitration-development/erc-1497-evidence-standard — evidence references.
- https://github.com/dimsky131/genlayer-ai-bounty-verifier — tìm thấy qua search; chưa audit toàn repo.

Không có screenshot đính kèm để đọc trong workspace ở lần này. Thiết kế không suy diễn danh mục trong screenshot, không tuyên bố được GenLayer endorse và không hứa lượng người dùng.
