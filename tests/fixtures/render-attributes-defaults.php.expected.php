
<button class="px-4 py-2 self-start text-sm whitespace-nowrap font-medium text-white bg-[#c70f19] border-bottom-[#980b13] hover:bg-[#df111c] hover:border-bottom-[#800a10] rounded-md shadow uppercase"
        >
    Button<?php if (true) : ?>!<?php endif; ?>

    <?php if (true) : ?>
        <span>Anne</span>
    <?php endif; ?>
    <?php if (false) : ?>
        <span>25</span>
    <?php elseif (true) : ?>
        <span>Cool</span>
    <?php else : ?>
        <span>Not cool</span>
    <?php endif; ?>

    <?php if (!true) : ?>
        <span>Wont Show</span>
    <?php endif; ?>
</button>
