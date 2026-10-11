import com.android.tools.smali.dexlib2.Opcode;
import com.android.tools.smali.dexlib2.builder.MutableMethodImplementation;
import com.android.tools.smali.dexlib2.builder.instruction.BuilderInstruction31i;
import com.android.tools.smali.dexlib2.builder.instruction.BuilderInstruction35c;
import com.android.tools.smali.dexlib2.dexbacked.DexBackedDexFile;
import com.android.tools.smali.dexlib2.iface.ClassDef;
import com.android.tools.smali.dexlib2.iface.Field;
import com.android.tools.smali.dexlib2.iface.Method;
import com.android.tools.smali.dexlib2.iface.MethodImplementation;
import com.android.tools.smali.dexlib2.iface.debug.*;
import com.android.tools.smali.dexlib2.iface.instruction.*;
import com.android.tools.smali.dexlib2.iface.instruction.formats.ArrayPayload;
import com.android.tools.smali.dexlib2.iface.reference.MethodReference;
import com.android.tools.smali.dexlib2.iface.value.*;
import com.android.tools.smali.dexlib2.immutable.ImmutableClassDef;
import com.android.tools.smali.dexlib2.immutable.ImmutableDexFile;
import com.android.tools.smali.dexlib2.immutable.ImmutableMethod;
import com.android.tools.smali.dexlib2.immutable.reference.ImmutableMethodReference;
import com.android.tools.smali.dexlib2.writer.pool.DexPool;
import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;

/** Narrow compatibility patch for Expo's internal Android notification dispatch. */
public final class PatchNotificationDispatch {
  private static final String TARGET = "Lexpo/modules/notifications/service/NotificationsService$Companion;";
  private static final int FOREGROUND = 0x10000000;
  // This helper patches only the reviewed team release. Future APKs must be
  // rebuilt from the durable Kotlin patch, or reviewed before changing this hash.
  private static final String ORIGINAL_SHA256 = "82e8ce639d500edc3bfbe7daf53245bfcc029bfd974887ca5fee23f4a9c9a354";
  private static final String SEND = "Landroid/content/Context;->sendBroadcast(Landroid/content/Intent;)V";
  private static final String GET_BROADCAST = "Landroid/app/PendingIntent;->getBroadcast(Landroid/content/Context;ILandroid/content/Intent;I)Landroid/app/PendingIntent;";
  private static final String ADD_FLAGS = "Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;";
  private static final Map<String, Integer> ANCHORS = Map.of("doWork", 12, "createNotificationTrigger", 51);

  private record Input(String entry, byte[] bytes, DexBackedDexFile dex, ClassDef target) {}
  private record Counts(int classes, int methods, int unchangedMethods, long unchangedInstructions, int defaultInitializersNormalized) {}

  public static void main(String[] args) throws Exception {
    if (args.length == 3 && args[0].equals("--patch")) {
      patch(Path.of(args[1]), Path.of(args[2]));
      return;
    }
    if (args.length == 3 && args[0].equals("--verify")) {
      Input input = readInput(Path.of(args[1]));
      byte[] patched = Files.readAllBytes(Path.of(args[2]));
      Counts counts = verify(input, new DexBackedDexFile(null, patched));
      System.out.println(metadata(input, patched, counts));
      return;
    }
    if (args.length != 2 || !args[0].equals("--inspect")) {
      throw new IllegalArgumentException("Usage: --inspect <apk> | --patch <apk> <output-directory> | --verify <apk> <patched.dex>");
    }
    Input input = readInput(Path.of(args[1]));
    System.out.println("dex_entry=" + input.entry + " sha256=" + sha256(input.bytes));
    for (Method method : input.target.getMethods()) {
      if (method.getName().equals("doWork") || method.getName().equals("createNotificationTrigger")) {
        System.out.println("method=" + method + " registers=" + method.getImplementation().getRegisterCount());
        int index = 0;
        int address = 0;
        for (Instruction instruction : method.getImplementation().getInstructions()) {
          System.out.printf("%3d @%04x %s%n", index++, address, describe(instruction));
          address += instruction.getCodeUnits();
        }
      }
    }
  }

  private static void patch(Path apk, Path output) throws Exception {
    Input input = readInput(apk);
    require(input.entry.equals("classes4.dex") && sha256(input.bytes).equals(ORIGINAL_SHA256), "Unreviewed baseline DEX; refusing to patch");
    List<ClassDef> classes = new ArrayList<>();
    int patchedMethods = 0;
    for (ClassDef clazz : input.dex.getClasses()) {
      if (!clazz.getType().equals(TARGET)) { classes.add(clazz); continue; }
      List<Method> methods = new ArrayList<>();
      for (Method method : clazz.getMethods()) {
        if (!ANCHORS.containsKey(method.getName())) { methods.add(method); continue; }
        methods.add(patchMethod(method));
        patchedMethods++;
      }
      classes.add(new ImmutableClassDef(clazz.getType(), clazz.getAccessFlags(), clazz.getSuperclass(),
        clazz.getInterfaces(), clazz.getSourceFile(), clazz.getAnnotations(), clazz.getFields(), methods));
    }
    require(patchedMethods == 2, "Expected exactly two target methods");
    Files.createDirectories(output);
    Path original = output.resolve("classes4.original.dex");
    if (Files.exists(original)) require(sha256(Files.readAllBytes(original)).equals(ORIGINAL_SHA256), "Existing original DEX differs");
    else Files.write(original, input.bytes, StandardOpenOption.CREATE_NEW);
    Path patchedPath = output.resolve(input.entry);
    DexPool.writeTo(patchedPath.toString(), new ImmutableDexFile(input.dex.getOpcodes(), classes));
    byte[] patchedBytes = Files.readAllBytes(patchedPath);
    Counts counts = verify(input, new DexBackedDexFile(null, patchedBytes));
    String metadata = metadata(input, patchedBytes, counts);
    Files.writeString(output.resolve("metadata.json"), metadata + System.lineSeparator());
    System.out.println(metadata);
  }

  private static Method patchMethod(Method method) {
    MethodImplementation body = method.getImplementation();
    require(body != null && body.getTryBlocks().isEmpty(), "Unexpected target implementation/try blocks");
    List<Instruction> code = instructions(body);
    int anchor = ANCHORS.get(method.getName());
    requireNoIncomingAtInsertion(code, anchor, anchor + 1);
    int intent;
    int scratch;
    if (method.getName().equals("doWork")) {
      require(signature(method).equals(TARGET + "->doWork(Landroid/content/Context;Landroid/content/Intent;)V"), "Unexpected doWork signature");
      require(body.getRegisterCount() == 6 && code.size() == 29, "Unexpected doWork register layout");
      requireInvocation(code.get(anchor), Opcode.INVOKE_VIRTUAL, SEND, 4, 5);
      requireInvocation(code.get(anchor - 1), Opcode.INVOKE_VIRTUAL,
        "Landroid/content/Intent;->setComponent(Landroid/content/ComponentName;)Landroid/content/Intent;", 5, 1);
      require(code.get(anchor + 1).getOpcode() == Opcode.RETURN_VOID, "Scratch register not proven dead at sendBroadcast");
      // v0 last supplied the receiver name to ComponentName's constructor.
      // After sendBroadcast this path returns; v0 cannot remain live.
      intent = 5;
      scratch = 0;
    } else {
      require(signature(method).equals(TARGET + "->createNotificationTrigger(Landroid/content/Context;Ljava/lang/String;)Landroid/app/PendingIntent;"), "Unexpected trigger signature");
      require(body.getRegisterCount() == 9 && code.size() == 56, "Unexpected trigger register layout");
      requireInvocation(code.get(anchor), Opcode.INVOKE_STATIC, GET_BROADCAST, 7, 0, 1, 8);
      Instruction previous = code.get(anchor - 1);
      require(previous.getOpcode() == Opcode.OR_INT_2ADDR && previous instanceof TwoRegisterInstruction two
        && two.getRegisterA() == 8 && two.getRegisterB() == 2, "Unexpected PendingIntent flags calculation");
      // v2 last provided FLAG_UPDATE_CURRENT to the preceding OR. No later
      // instruction on this terminal path reads v2; parameters stay unchanged.
      for (int index = anchor; index < code.size(); index++) {
        require(!usedRegisters(code.get(index)).contains(2), "Scratch v2 is live after getBroadcast");
        require(!(code.get(index) instanceof OffsetInstruction), "Unexpected branch after trigger insertion");
      }
      intent = 1;
      scratch = 2;
    }
    require(code.stream().noneMatch(instruction -> instruction instanceof ReferenceInstruction reference
      && reference.getReference() instanceof MethodReference called && signature(called).equals(ADD_FLAGS)), "Target already contains addFlags");
    MutableMethodImplementation mutable = new MutableMethodImplementation(body);
    mutable.addInstruction(anchor, new BuilderInstruction31i(Opcode.CONST, scratch, FOREGROUND));
    mutable.addInstruction(anchor + 1, new BuilderInstruction35c(Opcode.INVOKE_VIRTUAL, 2, intent, scratch, 0, 0, 0,
      new ImmutableMethodReference("Landroid/content/Intent;", "addFlags", List.of("I"), "Landroid/content/Intent;")));
    return new ImmutableMethod(method.getDefiningClass(), method.getName(), method.getParameters(), method.getReturnType(),
      method.getAccessFlags(), method.getAnnotations(), method.getHiddenApiRestrictions(), mutable);
  }

  private static void requireInvocation(Instruction instruction, Opcode opcode, String reference, int... expectedRegisters) {
    require(instruction.getOpcode() == opcode && instruction instanceof FiveRegisterInstruction, "Unexpected invocation format");
    FiveRegisterInstruction five = (FiveRegisterInstruction) instruction;
    require(Arrays.equals(registers(five), expectedRegisters), "Unexpected invocation registers");
    require(instruction instanceof ReferenceInstruction ref && ref.getReference() instanceof MethodReference method
      && signature(method).equals(reference), "Unexpected invocation target");
  }

  private static Counts verify(Input input, DexBackedDexFile patched) throws Exception {
    require(sha256(input.bytes).equals(ORIGINAL_SHA256), "Unreviewed verification baseline");
    Map<String, ClassDef> afterClasses = new HashMap<>();
    for (ClassDef clazz : patched.getClasses()) afterClasses.put(clazz.getType(), clazz);
    require(afterClasses.size() == input.dex.getClasses().size(), "Class count changed");
    int methods = 0;
    int changed = 0;
    int defaultInitializersNormalized = 0;
    long unchangedInstructions = 0;
    for (ClassDef beforeClass : input.dex.getClasses()) {
      ClassDef afterClass = afterClasses.get(beforeClass.getType());
      require(afterClass != null, "Missing class " + beforeClass.getType());
      require(beforeClass.getAccessFlags() == afterClass.getAccessFlags()
        && Objects.equals(beforeClass.getSuperclass(), afterClass.getSuperclass())
        && beforeClass.getInterfaces().equals(afterClass.getInterfaces())
        && Objects.equals(beforeClass.getSourceFile(), afterClass.getSourceFile())
        && beforeClass.getAnnotations().equals(afterClass.getAnnotations()), "Class metadata changed: " + beforeClass.getType());
      Map<String, Field> fields = new HashMap<>();
      for (Field field : afterClass.getFields()) fields.put(field.toString(), field);
      int fieldCount = 0;
      for (Field field : beforeClass.getFields()) {
        fieldCount++;
        Field after = fields.get(field.toString());
        require(after != null && field.getAccessFlags() == after.getAccessFlags()
          && sameInitialValue(field, after)
          && field.getAnnotations().equals(after.getAnnotations())
          && field.getHiddenApiRestrictions().equals(after.getHiddenApiRestrictions()), "Field metadata changed: " + field
            + " initial=" + field.getInitialValue() + " -> " + (after == null ? "missing" : after.getInitialValue())
            + " flags=" + field.getAccessFlags() + " -> " + (after == null ? "missing" : after.getAccessFlags()));
        if (!Objects.equals(field.getInitialValue(), after.getInitialValue())) defaultInitializersNormalized++;
      }
      require(fieldCount == fields.size(), "Field count changed");
      Map<String, Method> afterMethods = new HashMap<>();
      for (Method method : afterClass.getMethods()) afterMethods.put(signature(method), method);
      int classMethodCount = 0;
      for (Method before : beforeClass.getMethods()) {
        methods++;
        classMethodCount++;
        Method after = afterMethods.get(signature(before));
        require(after != null && before.getAccessFlags() == after.getAccessFlags()
          && before.getAnnotations().equals(after.getAnnotations())
          && before.getHiddenApiRestrictions().equals(after.getHiddenApiRestrictions()), "Method metadata changed: " + before);
        require(before.getParameters().size() == after.getParameters().size(), "Parameters changed");
        for (int index = 0; index < before.getParameters().size(); index++) {
          var original = before.getParameters().get(index);
          var updated = after.getParameters().get(index);
          require(original.getType().equals(updated.getType()) && Objects.equals(original.getName(), updated.getName())
            && Objects.equals(original.getSignature(), updated.getSignature())
            && original.getAnnotations().equals(updated.getAnnotations()), "Parameter metadata changed: " + before);
        }
        boolean target = beforeClass.getType().equals(TARGET) && ANCHORS.containsKey(before.getName());
        if (target) { verifyChangedMethod(before, after); changed++; }
        else {
          require(bodyDescription(before.getImplementation()).equals(bodyDescription(after.getImplementation())), "Unexpected method change: " + before);
          if (before.getImplementation() != null) unchangedInstructions += instructions(before.getImplementation()).size();
        }
      }
      require(classMethodCount == afterMethods.size(), "Method count changed");
    }
    require(changed == 2, "Expected exactly two changed methods");
    return new Counts(afterClasses.size(), methods, methods - changed, unchangedInstructions, defaultInitializersNormalized);
  }

  private static void verifyChangedMethod(Method before, Method after) {
    require(before.getImplementation().getRegisterCount() == after.getImplementation().getRegisterCount(), "Register count changed");
    List<Instruction> original = instructions(before.getImplementation());
    List<Instruction> updated = instructions(after.getImplementation());
    int anchor = ANCHORS.get(before.getName());
    require(before.getImplementation().getTryBlocks().isEmpty() && after.getImplementation().getTryBlocks().isEmpty(),
      "Target try blocks changed");
    requireNoIncomingAtInsertion(original, anchor, anchor + 1);
    requireNoIncomingAtInsertion(updated, anchor, anchor + 3);
    require(updated.size() == original.size() + 2, "Unexpected instruction count in target");
    int scratch = before.getName().equals("doWork") ? 0 : 2;
    int intent = before.getName().equals("doWork") ? 5 : 1;
    require(updated.get(anchor).getOpcode() == Opcode.CONST && updated.get(anchor) instanceof OneRegisterInstruction one
      && one.getRegisterA() == scratch && updated.get(anchor) instanceof NarrowLiteralInstruction literal
      && literal.getNarrowLiteral() == FOREGROUND, "Foreground flag constant missing");
    requireInvocation(updated.get(anchor + 1), Opcode.INVOKE_VIRTUAL, ADD_FLAGS, intent, scratch);
    require(normalizedInstructions(original, Set.of()).equals(normalizedInstructions(updated, Set.of(anchor, anchor + 1))),
      "Original target instructions or branch destinations changed");
    require(debugDescription(before.getImplementation(), addressIndices(original, Set.of())).equals(
      debugDescription(after.getImplementation(), addressIndices(updated, Set.of(anchor, anchor + 1)))),
      "Target debug items or their logical locations changed");
  }

  private static void requireNoIncomingAtInsertion(List<Instruction> code, int firstIndex, int lastIndex) {
    Set<Integer> prohibited = new HashSet<>();
    int address = 0;
    for (int index = 0; index < code.size(); index++) {
      if (index >= firstIndex && index <= lastIndex) prohibited.add(address);
      address += code.get(index).getCodeUnits();
    }
    address = 0;
    for (Instruction instruction : code) {
      require(!(instruction instanceof SwitchPayload), "Unexpected target switch; incoming-path proof unavailable");
      if (instruction instanceof OffsetInstruction offset) {
        require(!prohibited.contains(address + offset.getCodeOffset()), "Incoming branch could bypass foreground flag");
      }
      address += instruction.getCodeUnits();
    }
  }

  private static Map<Integer, Integer> addressIndices(List<Instruction> instructions, Set<Integer> skipped) {
    Map<Integer, Integer> addresses = new HashMap<>();
    int address = 0;
    int logicalIndex = 0;
    for (int index = 0; index < instructions.size(); index++) {
      addresses.put(address, logicalIndex);
      address += instructions.get(index).getCodeUnits();
      if (!skipped.contains(index)) logicalIndex++;
    }
    addresses.put(address, logicalIndex);
    return addresses;
  }

  private static List<String> normalizedInstructions(List<Instruction> instructions, Set<Integer> skipped) {
    Map<Integer, Integer> addresses = addressIndices(instructions, skipped);
    List<String> result = new ArrayList<>();
    int address = 0;
    for (int index = 0; index < instructions.size(); index++) {
      Instruction instruction = instructions.get(index);
      if (!skipped.contains(index)) {
        String description = describe(instruction);
        if (instruction instanceof OffsetInstruction offset) {
          Integer target = addresses.get(address + offset.getCodeOffset());
          require(target != null, "Invalid branch destination");
          description = description.replace(" offset=" + offset.getCodeOffset(), " target-index=" + target);
        }
        result.add(description);
      }
      address += instruction.getCodeUnits();
    }
    return result;
  }

  private static List<String> bodyDescription(MethodImplementation body) {
    if (body == null) return List.of("abstract-or-native");
    List<String> result = new ArrayList<>();
    result.add("registers=" + body.getRegisterCount());
    for (Instruction instruction : body.getInstructions()) result.add(describe(instruction));
    for (var block : body.getTryBlocks()) {
      result.add("try=" + block.getStartCodeAddress() + ":" + block.getCodeUnitCount());
      for (var handler : block.getExceptionHandlers()) result.add("handler=" + handler.getExceptionType() + ":" + handler.getHandlerCodeAddress());
    }
    result.addAll(debugDescription(body, null));
    return result;
  }

  private static List<String> debugDescription(MethodImplementation body, Map<Integer, Integer> normalizedAddresses) {
    List<String> result = new ArrayList<>();
    for (DebugItem item : body.getDebugItems()) {
      Integer location = normalizedAddresses == null ? item.getCodeAddress() : normalizedAddresses.get(item.getCodeAddress());
      require(location != null, "Debug item is not at an instruction boundary");
      String line = "debug=" + item.getDebugItemType() + ":" + location;
      if (item instanceof LineNumber number) line += ":line=" + number.getLineNumber();
      if (item instanceof LocalInfo local) line += ":local=" + local.getName() + ":" + local.getType() + ":" + local.getSignature();
      if (item instanceof StartLocal local) line += ":register=" + local.getRegister();
      if (item instanceof EndLocal local) line += ":register=" + local.getRegister();
      if (item instanceof RestartLocal local) line += ":register=" + local.getRegister();
      if (item instanceof SetSourceFile source) line += ":source=" + source.getSourceFile();
      result.add(line);
    }
    return result;
  }

  private static List<Instruction> instructions(MethodImplementation body) {
    List<Instruction> result = new ArrayList<>();
    body.getInstructions().forEach(result::add);
    return result;
  }

  private static int[] registers(FiveRegisterInstruction instruction) {
    int[] registers = { instruction.getRegisterC(), instruction.getRegisterD(), instruction.getRegisterE(), instruction.getRegisterF(), instruction.getRegisterG() };
    return Arrays.copyOf(registers, instruction.getRegisterCount());
  }

  private static Set<Integer> usedRegisters(Instruction instruction) {
    Set<Integer> result = new HashSet<>();
    if (instruction instanceof FiveRegisterInstruction five) for (int register : registers(five)) result.add(register);
    else if (instruction instanceof RegisterRangeInstruction range) for (int index = 0; index < range.getRegisterCount(); index++) result.add(range.getStartRegister() + index);
    else {
      if (instruction instanceof OneRegisterInstruction one) result.add(one.getRegisterA());
      if (instruction instanceof TwoRegisterInstruction two) result.add(two.getRegisterB());
      if (instruction instanceof ThreeRegisterInstruction three) result.add(three.getRegisterC());
    }
    return result;
  }

  private static String signature(MethodReference method) {
    return method.getDefiningClass() + "->" + method.getName() + "(" + String.join("", method.getParameterTypes()) + ")" + method.getReturnType();
  }

  private static void require(boolean condition, String message) {
    if (!condition) throw new IllegalStateException(message);
  }

  private static boolean sameInitialValue(Field before, Field after) {
    EncodedValue original = before.getInitialValue();
    EncodedValue updated = after.getInitialValue();
    if (Objects.equals(original, updated)) return true;
    // DexPool omits trailing static default values. Accept only exact defaults
    // for the declared field type, never a nonzero, string, or other reference.
    if ((before.getAccessFlags() & 0x8) == 0 || (original != null && updated != null)) return false;
    EncodedValue present = original != null ? original : updated;
    return switch (before.getType()) {
      case "Z" -> present instanceof BooleanEncodedValue value && !value.getValue();
      case "B" -> present instanceof ByteEncodedValue value && value.getValue() == 0;
      case "S" -> present instanceof ShortEncodedValue value && value.getValue() == 0;
      case "C" -> present instanceof CharEncodedValue value && value.getValue() == 0;
      case "I" -> present instanceof IntEncodedValue value && value.getValue() == 0;
      case "J" -> present instanceof LongEncodedValue value && value.getValue() == 0;
      case "F" -> present instanceof FloatEncodedValue value && Float.floatToRawIntBits(value.getValue()) == 0;
      case "D" -> present instanceof DoubleEncodedValue value && Double.doubleToRawLongBits(value.getValue()) == 0;
      default -> (before.getType().startsWith("L") || before.getType().startsWith("[")) && present instanceof NullEncodedValue;
    };
  }

  private static String metadata(Input input, byte[] patched, Counts counts) throws Exception {
    return "{\n  \"dexEntry\": \"" + input.entry + "\",\n  \"originalSha256\": \"" + sha256(input.bytes)
      + "\",\n  \"patchedSha256\": \"" + sha256(patched) + "\",\n  \"changedMethods\": 2,\n  \"unchangedMethods\": "
      + counts.unchangedMethods + ",\n  \"unchangedInstructions\": " + counts.unchangedInstructions
      + ",\n  \"classCount\": " + counts.classes + ",\n  \"methodCount\": " + counts.methods
      + ",\n  \"defaultInitializersNormalized\": " + counts.defaultInitializersNormalized
      + ",\n  \"insertedInstructions\": 4,\n  \"registerCountsPreserved\": true,\n  \"branchDestinationsPreserved\": true,\n  \"noIncomingBranchAtInsertion\": true,\n  \"targetDebugItemsPreserved\": true,\n  \"targetTryBlocksPreserved\": true\n}";
  }

  private static Input readInput(Path apk) throws Exception {
    Input found = null;
    try (ZipFile zip = new ZipFile(apk.toFile())) {
      for (ZipEntry entry : Collections.list(zip.entries())) {
        if (!entry.getName().matches("classes(?:\\d+)?\\.dex")) continue;
        byte[] bytes;
        try (InputStream stream = zip.getInputStream(entry)) { bytes = stream.readAllBytes(); }
        DexBackedDexFile dex = new DexBackedDexFile(null, bytes);
        for (ClassDef clazz : dex.getClasses()) {
          if (!clazz.getType().equals(TARGET)) continue;
          if (found != null) throw new IllegalStateException("Target occurs in more than one DEX");
          found = new Input(entry.getName(), bytes, dex, clazz);
        }
      }
    }
    if (found == null) throw new IllegalStateException("Expected Expo NotificationsService companion missing");
    return found;
  }

  private static String describe(Instruction instruction) {
    StringBuilder value = new StringBuilder(instruction.getOpcode().name());
    if (instruction instanceof VariableRegisterInstruction registers) {
      if (instruction instanceof FiveRegisterInstruction five) {
        int[] args = { five.getRegisterC(), five.getRegisterD(), five.getRegisterE(), five.getRegisterF(), five.getRegisterG() };
        value.append(" regs=").append(Arrays.toString(Arrays.copyOf(args, registers.getRegisterCount())));
      } else if (instruction instanceof RegisterRangeInstruction range) {
        value.append(" regs=").append(range.getStartRegister()).append("+").append(range.getRegisterCount());
      }
    } else {
      if (instruction instanceof OneRegisterInstruction one) value.append(" A=v").append(one.getRegisterA());
      if (instruction instanceof TwoRegisterInstruction two) value.append(" B=v").append(two.getRegisterB());
      if (instruction instanceof ThreeRegisterInstruction three) value.append(" C=v").append(three.getRegisterC());
    }
    if (instruction instanceof NarrowLiteralInstruction literal) value.append(" literal=").append(literal.getNarrowLiteral());
    else if (instruction instanceof WideLiteralInstruction literal) value.append(" literal=").append(literal.getWideLiteral());
    if (instruction instanceof OffsetInstruction offset) value.append(" offset=").append(offset.getCodeOffset());
    if (instruction instanceof ReferenceInstruction reference) value.append(" ref=").append(reference.getReference());
    if (instruction instanceof DualReferenceInstruction reference) value.append(" ref2=").append(reference.getReference2());
    if (instruction instanceof ArrayPayload array) value.append(" width=").append(array.getElementWidth()).append(" elements=").append(array.getArrayElements());
    if (instruction instanceof SwitchPayload payload) for (SwitchElement element : payload.getSwitchElements()) value.append(" case=").append(element.getKey()).append(":").append(element.getOffset());
    if (instruction instanceof VerificationErrorInstruction error) value.append(" verification-error=").append(error.getVerificationError());
    if (instruction instanceof FieldOffsetInstruction field) value.append(" field-offset=").append(field.getFieldOffset());
    if (instruction instanceof InlineIndexInstruction inline) value.append(" inline-index=").append(inline.getInlineIndex());
    if (instruction instanceof VtableIndexInstruction table) value.append(" vtable-index=").append(table.getVtableIndex());
    return value.toString();
  }

  private static String sha256(byte[] bytes) throws Exception {
    return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
  }
}
